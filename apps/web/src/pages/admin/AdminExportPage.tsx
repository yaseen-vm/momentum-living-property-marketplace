import { useState } from "react";
import { Download } from "lucide-react";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, USER_TYPES, USER_TYPE_LABELS } from "@momentum/shared";
import type { ExportType } from "@momentum/shared";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { AdminCard, AdminField, AdminPage, ErrorBox, adminInputClass, fromDateInput, useAdminToken } from "../../components/admin/AdminUi";

type Period = "24h" | "2d" | "7d" | "30d" | "custom";
const PERIODS: Array<{ value: Period; label: string }> = [
  { value: "24h", label: "Last 24 hours" },
  { value: "2d", label: "Last 2 days" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "custom", label: "Custom range (up to 366 days)" },
];

const COLUMNS: Record<ExportType, string> = {
  leads: "Reference, Created, User Type, Name, Company, Position, Email, Mobile, Status, Assigned Agent, Matches, Requests, Requirements",
  enquirers: "Name, Mobile, Mobile Verified, Signup Date, Last Login",
};

export default function AdminExportPage() {
  const token = useAdminToken();
  const [type, setType] = useState<ExportType>("leads");
  const [period, setPeriod] = useState<Period>("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [userType, setUserType] = useState("");
  const [leadStatus, setLeadStatus] = useState("");
  const [dateField, setDateField] = useState<"created" | "last_login">("created");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function download() {
    setError(null);
    const params: Record<string, string> = { type, period };
    if (period === "custom") {
      const f = fromDateInput(from);
      const t = fromDateInput(to, true);
      if (f === undefined || t === undefined) {
        setError("Choose both dates.");
        return;
      }
      params["from"] = String(f);
      params["to"] = String(t);
    }
    if (type === "leads") {
      if (userType) params["user_type"] = userType;
      if (leadStatus) params["lead_status"] = leadStatus;
    } else {
      params["date_field"] = dateField;
    }

    setLoading(true);
    try {
      const blob = await api.admin.exportCsv(params, token);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }

  const choice = <T extends string>(value: T, current: T, set: (v: T) => void, label: string) => (
    <button
      key={value}
      type="button"
      aria-pressed={value === current}
      onClick={() => set(value)}
      className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
        value === current ? "border-navy-600 bg-navy-50 text-navy-800" : "border-slate-200 text-slate-600 hover:border-slate-300"
      }`}
    >
      {label}
    </button>
  );

  return (
    <AdminPage title="Export" description="CSV downloads for follow-up and reporting. Limited to 5 exports per hour.">
      <AdminCard className="max-w-xl">
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Export</p>
            <div className="flex gap-3">
              {choice<ExportType>("leads", type, setType, "Leads")}
              {choice<ExportType>("enquirers", type, setType, "Verified enquirers")}
            </div>
          </div>

          <AdminField label="Period" htmlFor="export-period" hint={type === "leads" ? "By the date the lead was received." : undefined}>
            <select id="export-period" value={period} onChange={(e) => setPeriod(e.target.value as Period)} className={adminInputClass}>
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </AdminField>
          {period === "custom" && (
            <div className="grid grid-cols-2 gap-3">
              <AdminField label="From" htmlFor="export-from">
                <input id="export-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={adminInputClass} />
              </AdminField>
              <AdminField label="To" htmlFor="export-to">
                <input id="export-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className={adminInputClass} />
              </AdminField>
            </div>
          )}

          {type === "leads" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="User type" htmlFor="export-type">
                <select id="export-type" value={userType} onChange={(e) => setUserType(e.target.value)} className={adminInputClass}>
                  <option value="">All</option>
                  {USER_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {USER_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </AdminField>
              <AdminField label="Status" htmlFor="export-status">
                <select id="export-status" value={leadStatus} onChange={(e) => setLeadStatus(e.target.value)} className={adminInputClass}>
                  <option value="">All</option>
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {LEAD_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </AdminField>
            </div>
          ) : (
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Filter by</p>
              <div className="flex gap-3">
                {choice("created", dateField, setDateField, "Signup date")}
                {choice("last_login", dateField, setDateField, "Last login")}
              </div>
            </div>
          )}

          <ErrorBox error={error} />
          <Button className="w-full" loading={loading} onClick={() => void download()}>
            <Download className="h-4 w-4" aria-hidden /> Download CSV
          </Button>
          <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            <span className="font-medium">Columns:</span> {COLUMNS[type]}
          </p>
        </div>
      </AdminCard>
    </AdminPage>
  );
}
