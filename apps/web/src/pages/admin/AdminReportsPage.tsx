import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/auth";
import { PageSpinner } from "../../components/ui/Spinner";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import type { AdminReports } from "../../lib/api";

type PresetRange = "7d" | "30d" | "90d" | "custom";

function getFromTs(range: PresetRange, customFrom: string): number {
  const now = Date.now();
  if (range === "7d") return now - 604_800_000;
  if (range === "30d") return now - 2_592_000_000;
  if (range === "90d") return now - 7_776_000_000;
  return new Date(customFrom).getTime();
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl p-5 ${color}`}>
      <div className="text-3xl font-extrabold text-slate-900">{value}</div>
      <div className="mt-1 text-sm font-medium text-slate-600">{label}</div>
    </div>
  );
}

export default function AdminReportsPage() {
  const { token } = useAuthStore();
  const [range, setRange] = useState<PresetRange>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const params: Record<string, string> = {
    from: String(getFromTs(range, customFrom)),
    to: range === "custom" ? String(new Date(customTo).getTime()) : String(Date.now()),
  };

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reports", params],
    queryFn: () => api.admin.getReports(params, token!),
    enabled: !!token,
  });

  const reports = data as AdminReports | undefined;

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-slate-900">Reports Dashboard</h1>
        <div className="flex flex-wrap gap-2 items-center">
          {(["7d", "30d", "90d", "custom"] as PresetRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                range === r
                  ? "border-primary-500 bg-primary-50 text-primary-700 font-medium"
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {r === "custom" ? "Custom" : `Last ${r}`}
            </button>
          ))}
          {range === "custom" && (
            <div className="flex gap-2">
              <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-36 text-xs" />
              <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-36 text-xs" />
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : !reports ? (
        <div className="py-16 text-center text-slate-400">No data available</div>
      ) : (
        <div className="space-y-8">
          {/* Summary */}
          <section>
            <h2 className="mb-3 font-semibold text-slate-700">Overview</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Total Customers" value={reports.customers_total} color="bg-blue-50" />
              <StatCard
                label="Total Listings"
                value={Object.values(reports.listings_by_status).reduce((a, b) => a + b, 0)}
                color="bg-indigo-50"
              />
              <StatCard
                label="Total Vendors"
                value={Object.values(reports.vendors_by_status).reduce((a, b) => a + b, 0)}
                color="bg-emerald-50"
              />
              <StatCard
                label="Total Bookings"
                value={Object.values(reports.bookings_by_status).reduce((a, b) => a + b, 0)}
                color="bg-amber-50"
              />
            </div>
          </section>

          {/* Listings by status */}
          <section>
            <h2 className="mb-3 font-semibold text-slate-700">Listings by Status</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {Object.entries(reports.listings_by_status).map(([status, count]) => (
                <div key={status} className="rounded-lg bg-white p-4 shadow-sm text-center">
                  <div className="text-2xl font-bold text-slate-900">{count}</div>
                  <div className="mt-1 text-xs text-slate-500 capitalize">{status.replace(/_/g, " ")}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Listings by type */}
          <section>
            <h2 className="mb-3 font-semibold text-slate-700">Listings by Type</h2>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(reports.listings_by_type).map(([type, count]) => (
                <div key={type} className="rounded-lg bg-white p-4 shadow-sm text-center">
                  <div className="text-2xl font-bold text-slate-900">{count}</div>
                  <div className="mt-1 text-xs text-slate-500 capitalize">{type}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Vendors by status */}
          <section>
            <h2 className="mb-3 font-semibold text-slate-700">Vendors by Status</h2>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(reports.vendors_by_status).map(([status, count]) => (
                <div key={status} className="rounded-lg bg-white p-4 shadow-sm text-center">
                  <div className="text-2xl font-bold text-slate-900">{count}</div>
                  <div className="mt-1 text-xs text-slate-500 capitalize">{status}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Bookings by status */}
          <section>
            <h2 className="mb-3 font-semibold text-slate-700">Bookings by Status</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(reports.bookings_by_status).map(([status, count]) => (
                <div key={status} className="rounded-lg bg-white p-4 shadow-sm text-center">
                  <div className="text-2xl font-bold text-slate-900">{count}</div>
                  <div className="mt-1 text-xs text-slate-500 capitalize">{status.replace(/_/g, " ")}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
