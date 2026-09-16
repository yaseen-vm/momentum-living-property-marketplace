import { useState } from "react";
import { Download } from "lucide-react";
import { useAuthStore } from "../../store/auth";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

type ExportType = "customers" | "vendors";
type DateField = "signup_date" | "last_login_at";
type DateRange = "24h" | "2d" | "7d" | "30d" | "custom";

function getDateRange(range: DateRange, customFrom: string, customTo: string): { from: number; to: number } {
  const now = Date.now();
  const to = now;
  if (range === "24h") return { from: now - 86_400_000, to };
  if (range === "2d") return { from: now - 172_800_000, to };
  if (range === "7d") return { from: now - 604_800_000, to };
  if (range === "30d") return { from: now - 2_592_000_000, to };
  return {
    from: new Date(customFrom).getTime(),
    to: new Date(customTo).getTime(),
  };
}

const API_BASE = (import.meta.env["VITE_API_URL"] as string | undefined) ?? "http://localhost:8787";

export default function AdminExportPage() {
  const { token } = useAuthStore();
  const [exportType, setExportType] = useState<ExportType>("customers");
  const [dateField, setDateField] = useState<DateField>("signup_date");
  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [vendorStatus, setVendorStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const { from, to } = getDateRange(dateRange, customFrom, customTo);
      const params = new URLSearchParams({
        type: exportType,
        field: dateField,
        from: String(from),
        to: String(to),
        ...(exportType === "vendors" && vendorStatus ? { status: vendorStatus } : {}),
      });
      const res = await fetch(`${API_BASE}/admin/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${exportType}-export-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-xl font-bold text-slate-900">Data Export</h1>

      <div className="max-w-lg rounded-xl bg-white p-6 shadow-sm space-y-5">
        {/* Export type */}
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Export Type</p>
          <div className="flex gap-3">
            {(["customers", "vendors"] as ExportType[]).map((t) => (
              <button
                key={t}
                onClick={() => setExportType(t)}
                className={`rounded-lg border-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  exportType === t
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Date field */}
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Filter By</p>
          <div className="flex gap-3">
            {[
              { value: "signup_date", label: "Signup Date" },
              { value: "last_login_at", label: "Last Login" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setDateField(f.value as DateField)}
                className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                  dateField === f.value
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date range */}
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Date Range</p>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "24h", label: "Last 24h" },
              { value: "2d", label: "Last 2 days" },
              { value: "7d", label: "Last 7 days" },
              { value: "30d", label: "Last 30 days" },
              { value: "custom", label: "Custom" },
            ].map((r) => (
              <button
                key={r.value}
                onClick={() => setDateRange(r.value as DateRange)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  dateRange === r.value
                    ? "border-primary-500 bg-primary-50 text-primary-700 font-medium"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          {dateRange === "custom" && (
            <div className="mt-3 flex gap-3">
              <Input
                label="From"
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
              <Input
                label="To"
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Vendor status filter */}
        {exportType === "vendors" && (
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Vendor Status (optional)</p>
            <select
              value={vendorStatus}
              onChange={(e) => setVendorStatus(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-full"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button
          className="w-full"
          loading={loading}
          onClick={() => void handleExport()}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>

        <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          <p className="font-medium mb-1">Exported columns:</p>
          {exportType === "customers" ? (
            <p>name, mobile, mobile_verified_at, signup_date, last_login_at</p>
          ) : (
            <p>name, mobile, mobile_verified_at, vendor_type, status, signup_date, last_login_at, company_name, licence_no</p>
          )}
        </div>
      </div>
    </div>
  );
}
