import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, USER_TYPES, USER_TYPE_LABELS } from "@momentum/shared";
import { api } from "../../lib/api";
import { Badge } from "../../components/ui/Badge";
import { PageSpinner } from "../../components/ui/Spinner";
import {
  AdminPage,
  EmptyState,
  ErrorBox,
  Pagination,
  adminInputClass,
  formatDateTime,
  fromDateInput,
  useAdminToken,
} from "../../components/admin/AdminUi";

const PAGE_SIZE = 25;

/** Filters live in the URL so a filtered list can be bookmarked and survives a refresh. */
const FILTERS = ["q", "user_type", "lead_status", "assigned_agent_id", "stage", "from", "to"] as const;

export default function AdminLeadsPage() {
  const token = useAdminToken();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const offset = Number(params.get("offset") ?? 0) || 0;

  const query: Record<string, string> = { limit: String(PAGE_SIZE), offset: String(offset) };
  for (const f of FILTERS) {
    const v = params.get(f);
    if (!v) continue;
    if (f === "from") query[f] = String(fromDateInput(v));
    else if (f === "to") query[f] = String(fromDateInput(v, true));
    else query[f] = v;
  }

  const leads = useQuery({
    queryKey: ["admin-leads", query],
    queryFn: () => api.admin.leads(query, token),
    placeholderData: keepPreviousData,
  });
  const agents = useQuery({ queryKey: ["admin-agents"], queryFn: () => api.admin.agents(token) });

  function setFilter(name: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    next.delete("offset");
    setParams(next, { replace: true });
  }

  const select = (name: string, label: string, options: Array<{ value: string; label: string }>) => (
    <select
      aria-label={label}
      value={params.get(name) ?? ""}
      onChange={(e) => setFilter(name, e.target.value)}
      className={adminInputClass}
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  return (
    <AdminPage title="Leads" description="Completed availability enquiries. Newest first.">
      <div className="mb-4 grid gap-3 rounded-xl bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <form
          className="relative sm:col-span-2"
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
            placeholder="Reference, name, company, mobile or email"
            aria-label="Search leads"
            className={`${adminInputClass} pl-9`}
          />
        </form>
        {select("user_type", "All user types", USER_TYPES.map((t) => ({ value: t, label: USER_TYPE_LABELS[t] })))}
        {select("lead_status", "All statuses", LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s] })))}
        {select("assigned_agent_id", "Any agent", [
          { value: "none", label: "Unassigned" },
          ...(agents.data?.agents ?? []).map((a) => ({ value: a.id, label: a.is_active ? a.name : `${a.name} (inactive)` })),
        ])}
        {select("stage", "Completed enquiries", [
          { value: "verified", label: "Abandoned after OTP" },
          { value: "all", label: "All enquiries" },
        ])}
        <label className="flex items-center gap-2 text-sm text-slate-500">
          From
          <input type="date" value={params.get("from") ?? ""} onChange={(e) => setFilter("from", e.target.value)} className={adminInputClass} />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-500">
          To
          <input type="date" value={params.get("to") ?? ""} onChange={(e) => setFilter("to", e.target.value)} className={adminInputClass} />
        </label>
      </div>

      <ErrorBox error={leads.error} />
      {leads.isPending ? (
        <PageSpinner />
      ) : !leads.data?.leads.length ? (
        <EmptyState>No leads match these filters.</EmptyState>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Lead</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Agent</th>
                  <th className="px-4 py-3 text-right font-medium">Matches</th>
                  <th className="px-4 py-3 text-right font-medium">Requests</th>
                  <th className="px-4 py-3 font-medium">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.data.leads.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link to={`/admin/leads/${l.id}`} className="font-medium text-navy-700 hover:underline">
                        {l.reference_no}
                      </Link>
                      <div className="text-xs text-slate-500">{USER_TYPE_LABELS[l.user_type]}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-900">{l.company_name ?? l.full_name}</div>
                      <div className="text-xs text-slate-500">
                        {l.company_name ? `${l.full_name} · ` : ""}
                        {l.mobile}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={l.stage === "completed" ? l.lead_status : "incomplete"} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{l.assigned_agent?.name ?? <span className="text-slate-400">Unassigned</span>}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{l.match_count}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{l.request_count}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDateTime(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            total={leads.data.total}
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
