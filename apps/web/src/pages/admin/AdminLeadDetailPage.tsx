import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Mail, Phone, RefreshCw } from "lucide-react";
import {
  EMIRATES,
  FACILITIES,
  LEAD_REQUEST_KIND_LABELS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  OPPORTUNITY_KIND_LABELS,
  OWNERSHIP_STATUS_LABELS,
  USER_TYPE_LABELS,
  locationLabel,
} from "@momentum/shared";
import type { AdminLeadDetail, LeadStatus } from "@momentum/shared";
import { api } from "../../lib/api";
import { formatDate } from "../../lib/format";
import { REQUIREMENT_SECTIONS } from "../../components/availability/requirementFields";
import type { FieldDef } from "../../components/availability/requirementFields";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { PageSpinner } from "../../components/ui/Spinner";
import {
  AdminCard,
  AdminField,
  AdminPage,
  ErrorBox,
  adminInputClass,
  formatDateTime,
  useAdminToken,
} from "../../components/admin/AdminUi";

export default function AdminLeadDetailPage() {
  const { id = "" } = useParams();
  const token = useAdminToken();
  const qc = useQueryClient();

  const lead = useQuery({ queryKey: ["admin-lead", id], queryFn: () => api.admin.lead(id, token) });
  const rematch = useMutation({
    mutationFn: () => api.admin.rematchLead(id, token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-lead", id] });
      void qc.invalidateQueries({ queryKey: ["admin-leads"] });
    },
  });

  if (lead.isPending) return <PageSpinner />;
  if (!lead.data) {
    return (
      <AdminPage title="Lead">
        <ErrorBox error={lead.error ?? "Lead not found"} />
      </AdminPage>
    );
  }
  const l = lead.data;

  return (
    <AdminPage
      title={`${l.reference_no} · ${l.company_name ?? l.full_name}`}
      description={`${USER_TYPE_LABELS[l.user_type]} enquiry received ${formatDateTime(l.created_at)}`}
      actions={
        <Link to="/admin/leads" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" aria-hidden /> All leads
        </Link>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ContactCard lead={l} />

          <AdminCard title="Requirements">
            {l.requirements ? (
              <RequirementsList lead={l} />
            ) : (
              <p className="text-sm text-slate-500">The enquirer stopped after verifying their mobile; no requirements yet.</p>
            )}
          </AdminCard>

          <AdminCard
            title={`Matched opportunities (${l.matches.length})`}
            actions={
              l.stage === "completed" && (
                <Button variant="secondary" size="sm" loading={rematch.isPending} onClick={() => rematch.mutate()}>
                  <RefreshCw className="h-4 w-4" aria-hidden /> Re-run matching
                </Button>
              )
            }
          >
            <ErrorBox error={rematch.error} />
            {rematch.data && (
              <p className="mb-3 text-sm text-green-700">Matching re-run: {rematch.data.match_count} opportunities.</p>
            )}
            {l.matches.length === 0 ? (
              <p className="text-sm text-slate-500">No opportunities matched. Add inventory, then re-run matching.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {l.matches.map((m) => (
                  <li key={m.listing_id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <div>
                      <Link to={`/admin/properties/${m.listing_id}`} className="font-medium text-navy-700 hover:underline">
                        {m.reference_no ?? "No ref"} · {m.title}
                      </Link>
                      <div className="text-xs text-slate-500">
                        {OPPORTUNITY_KIND_LABELS[m.opportunity_kind]} · {m.location_text}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(m.status !== "approved" || !m.is_available) && (
                        <Badge status={m.status !== "approved" ? m.status : "unavailable"} />
                      )}
                      <span className="rounded-full bg-navy-50 px-2 py-0.5 text-xs font-semibold text-navy-700">{m.score}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>

          <AdminCard title={`Information & viewing requests (${l.requests.length})`}>
            {l.requests.length === 0 ? (
              <p className="text-sm text-slate-500">No requests yet.</p>
            ) : (
              <ul className="space-y-3">
                {l.requests.map((r) => (
                  <li key={r.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-slate-900">
                        {LEAD_REQUEST_KIND_LABELS[r.kind]} ·{" "}
                        <Link to={`/admin/properties/${r.listing.id}`} className="text-navy-700 hover:underline">
                          {r.listing.reference_no ?? r.listing.title}
                        </Link>
                      </span>
                      <span className="text-xs text-slate-500">{formatDateTime(r.created_at)}</span>
                    </div>
                    {r.preferred_date && <p className="mt-1 text-slate-600">Preferred date: {formatDate(r.preferred_date)}</p>}
                    {r.message && <p className="mt-1 whitespace-pre-line text-slate-700">{r.message}</p>}
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>
        </div>

        <div className="space-y-6">
          <ManageCard lead={l} />
          <AdminCard title="Timeline">
            {l.notes.length === 0 ? (
              <p className="text-sm text-slate-500">No notes yet.</p>
            ) : (
              <ol className="space-y-4">
                {l.notes.map((n) => (
                  <li key={n.id} className="border-l-2 border-navy-100 pl-3 text-sm">
                    {n.status_change && <StatusChange value={n.status_change} />}
                    {n.body && <p className="whitespace-pre-line text-slate-700">{n.body}</p>}
                    <p className="mt-1 text-xs text-slate-400">
                      {n.author_name ?? "Admin"} · {formatDateTime(n.created_at)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </AdminCard>
        </div>
      </div>
    </AdminPage>
  );
}

function StatusChange({ value }: { value: string }) {
  const [from, to] = value.split("→") as [LeadStatus, LeadStatus];
  return (
    <p className="mb-1 font-medium text-slate-900">
      {LEAD_STATUS_LABELS[from] ?? from} → {LEAD_STATUS_LABELS[to] ?? to}
    </p>
  );
}

function ContactCard({ lead: l }: { lead: AdminLeadDetail }) {
  const rows: Array<[string, React.ReactNode]> = [
    ["Name", [l.full_name, l.position].filter(Boolean).join(", ")],
    ["Company", l.company_name],
    ["Business type", l.business_type],
    ["Website", l.company_website],
    ["Nationality", l.nationality],
    [
      "Ownership",
      l.ownership_status
        ? (OWNERSHIP_STATUS_LABELS[l.ownership_status as keyof typeof OWNERSHIP_STATUS_LABELS] ?? l.ownership_status)
        : null,
    ],
    ["Consent given", formatDateTime(l.consent_at)],
  ];
  return (
    <AdminCard title="Contact">
      <div className="mb-4 flex flex-wrap gap-2">
        <a href={`tel:${l.mobile}`} className="inline-flex items-center gap-2 rounded-lg bg-navy-50 px-3 py-1.5 text-sm text-navy-800 hover:bg-navy-100">
          <Phone className="h-4 w-4" aria-hidden /> {l.mobile} <span className="text-xs text-green-700">verified</span>
        </a>
        <a href={`mailto:${l.email}`} className="inline-flex items-center gap-2 rounded-lg bg-navy-50 px-3 py-1.5 text-sm text-navy-800 hover:bg-navy-100">
          <Mail className="h-4 w-4" aria-hidden /> {l.email}
        </a>
      </div>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {rows
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-slate-500">{k}</dt>
              <dd className="text-slate-900">{v}</dd>
            </div>
          ))}
      </dl>
    </AdminCard>
  );
}

/** Requirement answers labelled with the same field definitions as the wizard. */
function RequirementsList({ lead }: { lead: AdminLeadDetail }) {
  const r = lead.requirements ?? {};
  const fields = REQUIREMENT_SECTIONS[lead.user_type].flatMap((s) => s.fields);
  const items = fields
    .map((f) => [f.label, formatAnswer(f, r)] as const)
    .filter((entry): entry is readonly [string, string] => !!entry[1]);

  if (items.length === 0) return <p className="text-sm text-slate-500">No details given.</p>;
  return (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className={value.length > 60 ? "sm:col-span-2" : undefined}>
          <dt className="text-xs text-slate-500">{label}</dt>
          <dd className="whitespace-pre-line text-slate-900">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function formatAnswer(field: FieldDef, r: Record<string, unknown>): string | null {
  const value = r[field.name];
  switch (field.kind) {
    case "locations": {
      const areas = Array.isArray(r["location_slugs"]) ? (r["location_slugs"] as string[]) : [];
      const emirates = (Array.isArray(r["emirates"]) ? (r["emirates"] as string[]) : [])
        .filter((e) => !areas.some((a) => a.startsWith(`${e}-`)))
        .map((e) => `${EMIRATES.find((x) => x.slug === e)?.label ?? e} (any area)`);
      const all = [...areas.map(locationLabel), ...emirates];
      return all.length ? all.join("; ") : "Anywhere in the UAE";
    }
    case "facilities": {
      const list = Array.isArray(value) ? (value as string[]) : [];
      return list.length ? list.map((f) => FACILITIES.find((x) => x.slug === f)?.label ?? f).join(", ") : null;
    }
    case "money":
      return typeof value === "number" ? `AED ${value.toLocaleString("en-US")}` : null;
    case "number":
      return typeof value === "number" ? `${value.toLocaleString("en-US")}${field.unit ? ` ${field.unit}` : ""}` : null;
    case "date":
      return typeof value === "number" ? formatDate(value) : null;
    case "select":
    case "radio":
      return typeof value === "string" ? (field.options.find((o) => o.value === value)?.label ?? value) : null;
    default:
      return typeof value === "string" && value ? value : null;
  }
}

/** Status, agent and a note in one save; the API logs status changes to the timeline. */
function ManageCard({ lead }: { lead: AdminLeadDetail }) {
  const token = useAdminToken();
  const qc = useQueryClient();
  const agents = useQuery({ queryKey: ["admin-agents"], queryFn: () => api.admin.agents(token) });

  const [status, setStatus] = useState<LeadStatus>(lead.lead_status);
  const [agentId, setAgentId] = useState(lead.assigned_agent?.id ?? "");
  const [note, setNote] = useState("");

  // Follow the server after a save or refetch.
  useEffect(() => {
    setStatus(lead.lead_status);
    setAgentId(lead.assigned_agent?.id ?? "");
  }, [lead.lead_status, lead.assigned_agent?.id]);

  const statusChanged = status !== lead.lead_status;
  const agentChanged = agentId !== (lead.assigned_agent?.id ?? "");
  const dirty = statusChanged || agentChanged || !!note.trim();

  const save = useMutation({
    mutationFn: () =>
      api.admin.updateLead(
        lead.id,
        {
          ...(statusChanged ? { lead_status: status } : {}),
          ...(agentChanged ? { assigned_agent_id: agentId || null } : {}),
          ...(note.trim() ? { note: note.trim() } : {}),
        },
        token
      ),
    onSuccess: (updated) => {
      qc.setQueryData(["admin-lead", lead.id], updated);
      void qc.invalidateQueries({ queryKey: ["admin-leads"] });
      setNote("");
    },
  });

  // Inactive agents stay selectable only when already assigned.
  const agentOptions = (agents.data?.agents ?? []).filter((a) => a.is_active || a.id === lead.assigned_agent?.id);

  return (
    <AdminCard title="Manage lead">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (dirty) save.mutate();
        }}
      >
        <div className="flex items-center gap-2 text-sm text-slate-500">
          Current status: <Badge status={lead.lead_status} />
        </div>
        <AdminField label="Status" htmlFor="lead-status">
          <select id="lead-status" value={status} onChange={(e) => setStatus(e.target.value as LeadStatus)} className={adminInputClass}>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {LEAD_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </AdminField>
        <AdminField label="Assigned agent" htmlFor="lead-agent">
          <select id="lead-agent" value={agentId} onChange={(e) => setAgentId(e.target.value)} className={adminInputClass}>
            <option value="">Unassigned</option>
            {agentOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.is_active ? "" : " (inactive)"}
              </option>
            ))}
          </select>
        </AdminField>
        <AdminField label="Internal note" htmlFor="lead-note" hint="Visible to admins only. Saved to the timeline.">
          <textarea
            id="lead-note"
            rows={3}
            maxLength={2000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={adminInputClass}
            placeholder="e.g. Called, sending three options by email"
          />
        </AdminField>
        <ErrorBox error={save.error} />
        <Button type="submit" className="w-full" loading={save.isPending} disabled={!dirty || save.isPending}>
          Save
        </Button>
      </form>
    </AdminCard>
  );
}
