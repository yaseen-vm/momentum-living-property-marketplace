import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LEAD_REQUEST_KIND_LABELS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  OPPORTUNITY_KINDS,
  OPPORTUNITY_KIND_LABELS,
  PROPERTY_STATUS_LABELS,
  USER_TYPES,
  USER_TYPE_LABELS,
} from "@momentum/shared";
import type { LeadRequestKind } from "@momentum/shared";
import { api } from "../../lib/api";
import { PageSpinner } from "../../components/ui/Spinner";
import { AdminCard, AdminPage, ErrorBox, adminInputClass, fromDateInput, useAdminToken } from "../../components/admin/AdminUi";

type Range = "7d" | "30d" | "90d" | "all" | "custom";
const RANGE_DAYS: Partial<Record<Range, number>> = { "7d": 7, "30d": 30, "90d": 90 };
const RANGE_LABELS: Record<Range, string> = { "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days", all: "All time", custom: "Custom" };

function Stat({ label, value, to }: { label: string; value: number; to?: string }) {
  const body = (
    <>
      <div className="text-3xl font-bold tabular-nums text-navy-900">{value.toLocaleString("en-US")}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </>
  );
  return to ? (
    <Link to={to} className="rounded-xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      {body}
    </Link>
  ) : (
    <div className="rounded-xl bg-white p-5 shadow-sm">{body}</div>
  );
}

/** Horizontal bars; each row links to the filtered list when `href` is given. */
function Breakdown({ rows }: { rows: Array<{ label: string; value: number; href?: string }> }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[9rem_1fr_3rem] items-center gap-3 text-sm sm:grid-cols-[12rem_1fr_3rem]">
          {r.href ? (
            <Link to={r.href} className="truncate text-slate-700 hover:underline">
              {r.label}
            </Link>
          ) : (
            <span className="truncate text-slate-700">{r.label}</span>
          )}
          <span className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <span className="block h-full rounded-full bg-navy-600" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="text-right tabular-nums text-slate-900">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

export default function AdminReportsPage() {
  const token = useAdminToken();
  const [range, setRange] = useState<Range>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // Memoised: Date.now() in the query key would otherwise refetch on every render.
  const params = useMemo((): Record<string, string> | null => {
    if (range === "all") return {};
    if (range === "custom") {
      const from = fromDateInput(customFrom);
      const to = fromDateInput(customTo, true);
      return from !== undefined && to !== undefined ? { from: String(from), to: String(to) } : null;
    }
    const now = Date.now();
    return { from: String(now - RANGE_DAYS[range]! * 86_400_000), to: String(now) };
  }, [range, customFrom, customTo]);

  const reports = useQuery({
    queryKey: ["admin-reports", params],
    queryFn: () => api.admin.reports(params ?? {}, token),
    enabled: params !== null,
  });
  const r = reports.data;

  return (
    <AdminPage
      title="Reports"
      description="Leads, requests and enquirers are counted by date received; properties show current inventory."
      actions={
        <>
          <select aria-label="Date range" value={range} onChange={(e) => setRange(e.target.value as Range)} className={adminInputClass}>
            {(Object.keys(RANGE_LABELS) as Range[]).map((k) => (
              <option key={k} value={k}>
                {RANGE_LABELS[k]}
              </option>
            ))}
          </select>
          {range === "custom" && (
            <>
              <input type="date" aria-label="From" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className={adminInputClass} />
              <input type="date" aria-label="To" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className={adminInputClass} />
            </>
          )}
        </>
      }
    >
      <ErrorBox error={reports.error} />
      {params === null ? (
        <p className="text-sm text-slate-500">Choose both dates.</p>
      ) : reports.isPending || !r ? (
        <PageSpinner />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Leads" value={r.leads.total} to="/admin/leads" />
            <Stat label="Info & viewing requests" value={r.requests.info + r.requests.viewing} />
            <Stat label="Available opportunities" value={r.properties.available} to="/admin/properties?status=approved&is_available=true" />
            <Stat label="Verified enquirers" value={r.enquirers.verified} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <AdminCard title="Leads by status">
              <Breakdown
                rows={LEAD_STATUSES.map((s) => ({ label: LEAD_STATUS_LABELS[s], value: r.leads.by_status[s], href: `/admin/leads?lead_status=${s}` }))}
              />
            </AdminCard>
            <AdminCard title="Leads by user type">
              <Breakdown
                rows={USER_TYPES.map((t) => ({ label: USER_TYPE_LABELS[t], value: r.leads.by_user_type[t], href: `/admin/leads?user_type=${t}` }))}
              />
            </AdminCard>
            <AdminCard title={`Opportunities by kind (${r.properties.total} not archived)`}>
              <Breakdown
                rows={OPPORTUNITY_KINDS.map((k) => ({
                  label: OPPORTUNITY_KIND_LABELS[k],
                  value: r.properties.by_kind[k],
                  href: `/admin/properties?opportunity_kind=${k}`,
                }))}
              />
            </AdminCard>
            <AdminCard title="Properties by status">
              <Breakdown
                rows={Object.entries(r.properties.by_status).map(([s, n]) => ({
                  label: PROPERTY_STATUS_LABELS[s] ?? s,
                  value: n,
                  href: `/admin/properties?status=${s}`,
                }))}
              />
            </AdminCard>
            <AdminCard title="Requests">
              <Breakdown
                rows={(Object.keys(r.requests) as LeadRequestKind[]).map((k) => ({ label: LEAD_REQUEST_KIND_LABELS[k], value: r.requests[k] }))}
              />
            </AdminCard>
          </div>
        </div>
      )}
    </AdminPage>
  );
}
