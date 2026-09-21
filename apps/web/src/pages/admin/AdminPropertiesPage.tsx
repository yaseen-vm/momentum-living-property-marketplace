import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ImageOff, Plus, Search } from "lucide-react";
import {
  LOCATIONS,
  OPPORTUNITY_KINDS,
  OPPORTUNITY_KIND_LABELS,
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  locationLabel,
} from "@momentum/shared";
import type { AdminPropertySummary } from "@momentum/shared";
import { api } from "../../lib/api";
import { formatPrice } from "../../lib/format";
import { Badge } from "../../components/ui/Badge";
import { PageSpinner } from "../../components/ui/Spinner";
import { AdminPage, EmptyState, ErrorBox, Pagination, adminInputClass, useAdminToken } from "../../components/admin/AdminUi";

const PAGE_SIZE = 25;
const FILTERS = ["q", "opportunity_kind", "type", "status", "is_available", "location"] as const;

export default function AdminPropertiesPage() {
  const token = useAdminToken();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const offset = Number(params.get("offset") ?? 0) || 0;

  const query: Record<string, string> = { limit: String(PAGE_SIZE), offset: String(offset) };
  for (const f of FILTERS) {
    const v = params.get(f);
    if (v) query[f] = v;
  }

  const list = useQuery({
    queryKey: ["admin-properties", query],
    queryFn: () => api.admin.properties(query, token),
    placeholderData: keepPreviousData,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-properties"] });
  const toggle = useMutation({
    mutationFn: (p: AdminPropertySummary) => api.admin.setPropertyAvailability(p.id, !p.is_available, token),
    onSuccess: refresh,
  });
  const archive = useMutation({ mutationFn: (id: string) => api.admin.archiveProperty(id, token), onSuccess: refresh });

  function setFilter(name: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    next.delete("offset");
    setParams(next, { replace: true });
  }

  const select = (name: string, label: string, options: Array<{ value: string; label: string }>) => (
    <select aria-label={label} value={params.get(name) ?? ""} onChange={(e) => setFilter(name, e.target.value)} className={adminInputClass}>
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  return (
    <AdminPage
      title="Properties & opportunities"
      description="Only published and available records can be matched to enquiries."
      actions={
        <Link
          to="/admin/properties/new"
          className="inline-flex items-center gap-2 rounded-lg bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900"
        >
          <Plus className="h-4 w-4" aria-hidden /> New property
        </Link>
      }
    >
      <div className="mb-4 grid gap-3 rounded-xl bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
        <form
          className="relative sm:col-span-2 lg:col-span-3"
          onSubmit={(e) => {
            e.preventDefault();
            setFilter("q", search.trim());
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onBlur={() => setFilter("q", search.trim())}
            placeholder="Reference, title, location or owner"
            aria-label="Search properties"
            className={`${adminInputClass} pl-9`}
          />
        </form>
        {select("opportunity_kind", "All opportunity kinds", OPPORTUNITY_KINDS.map((k) => ({ value: k, label: OPPORTUNITY_KIND_LABELS[k] })))}
        {select("type", "All property types", PROPERTY_TYPES.map((t) => ({ value: t, label: PROPERTY_TYPE_LABELS[t] })))}
        {select("location", "All locations", LOCATIONS.map((l) => ({ value: l.slug, label: locationLabel(l.slug) })))}
        {select("status", "Active (not archived)", [
          { value: "approved", label: "Published" },
          { value: "draft", label: "Draft" },
          { value: "pending", label: "Pending review (vendor)" },
          { value: "archived", label: "Archived" },
          { value: "all", label: "All statuses" },
        ])}
        {select("is_available", "Any availability", [
          { value: "true", label: "Available" },
          { value: "false", label: "Unavailable" },
        ])}
      </div>

      <ErrorBox error={list.error ?? toggle.error ?? archive.error} />
      {list.isPending ? (
        <PageSpinner />
      ) : !list.data?.properties.length ? (
        <EmptyState>No properties match these filters.</EmptyState>
      ) : (
        <>
          <ul className="space-y-3">
            {list.data.properties.map((p) => (
              <li key={p.id} className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                <div className="h-20 w-full shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:w-28">
                  {p.cover_photo_url ? (
                    <img src={p.cover_photo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-300">
                      <ImageOff className="h-6 w-6" aria-hidden />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/admin/properties/${p.id}`} className="font-medium text-navy-700 hover:underline">
                      {p.reference_no ? `${p.reference_no} · ` : ""}
                      {p.title}
                    </Link>
                    <Badge status={p.status} />
                    {!p.is_available && <Badge status="unavailable" />}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {OPPORTUNITY_KIND_LABELS[p.opportunity_kind]} · {PROPERTY_TYPE_LABELS[p.type] ?? p.type} · {p.location_text}
                    {p.total_capacity !== null && ` · ${p.total_capacity.toLocaleString("en-US")} persons`}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatPrice(p.show_price ? p.price : null, p.currency, p.price_period)}
                    {!p.show_price && p.price !== null && ` (hidden: ${p.currency} ${p.price.toLocaleString("en-US")})`}
                    {" · "}
                    {p.assigned_agent ? `Agent: ${p.assigned_agent.name}` : "No agent"}
                    {" · "}
                    {p.match_count} {p.match_count === 1 ? "match" : "matches"}
                    {p.owner_name && ` · Owner: ${p.owner_name}`}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={p.is_available}
                      disabled={toggle.isPending || p.status === "archived"}
                      onChange={() => toggle.mutate(p)}
                      className="h-4 w-4 rounded border-slate-300 text-navy-600"
                    />
                    Available
                  </label>
                  {p.status !== "archived" && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Archive ${p.reference_no ?? p.title}? It will stop matching new enquiries.`)) archive.mutate(p.id);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      <Archive className="h-4 w-4" aria-hidden /> Archive
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <Pagination
            total={list.data.total}
            limit={PAGE_SIZE}
            offset={offset}
            onChange={(o) => {
              const next = new URLSearchParams(params);
              next.set("offset", String(o));
              setParams(next);
            }}
          />
        </>
      )}
    </AdminPage>
  );
}
