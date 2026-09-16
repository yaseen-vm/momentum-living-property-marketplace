import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/auth";
import { PageSpinner } from "../../components/ui/Spinner";
import { Input } from "../../components/ui/Input";
function getFromTs(range, customFrom) {
    const now = Date.now();
    if (range === "7d")
        return now - 604_800_000;
    if (range === "30d")
        return now - 2_592_000_000;
    if (range === "90d")
        return now - 7_776_000_000;
    return new Date(customFrom).getTime();
}
function StatCard({ label, value, color }) {
    return (_jsxs("div", { className: `rounded-xl p-5 ${color}`, children: [_jsx("div", { className: "text-3xl font-extrabold text-slate-900", children: value }), _jsx("div", { className: "mt-1 text-sm font-medium text-slate-600", children: label })] }));
}
export default function AdminReportsPage() {
    const { token } = useAuthStore();
    const [range, setRange] = useState("30d");
    const [customFrom, setCustomFrom] = useState("");
    const [customTo, setCustomTo] = useState("");
    // useMemo prevents Date.now() from creating a new object every render,
    // which would change the queryKey on every tick and keep isLoading permanently true.
    const params = useMemo(() => ({
        from: String(getFromTs(range, customFrom)),
        to: range === "custom" ? String(new Date(customTo).getTime()) : String(Date.now()),
    }), [range, customFrom, customTo]);
    const { data, isLoading } = useQuery({
        queryKey: ["admin-reports", params],
        queryFn: () => api.admin.getReports(params, token),
        enabled: !!token,
    });
    // API shape: { listings, vendors, customers, bookings } — flatten for the template
    const reports = data ? {
        customers_total: data.customers?.total ?? 0,
        listings_by_status: {
            pending: data.listings?.pending ?? 0,
            approved: data.listings?.approved ?? 0,
            rejected: data.listings?.rejected ?? 0,
        },
        listings_by_type: data.listings?.by_type ?? {},
        vendors_by_status: {
            pending: data.vendors?.pending ?? 0,
            approved: data.vendors?.approved ?? 0,
            rejected: data.vendors?.rejected ?? 0,
        },
        bookings_by_status: {
            pending: data.bookings?.pending ?? 0,
            owner_confirmed: data.bookings?.owner_confirmed ?? 0,
            customer_contacted: data.bookings?.customer_contacted ?? 0,
            closed: data.bookings?.closed ?? 0,
        },
    } : null;
    return (_jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "mb-6 flex flex-wrap items-center justify-between gap-4", children: [_jsx("h1", { className: "text-xl font-bold text-slate-900", children: "Reports Dashboard" }), _jsxs("div", { className: "flex flex-wrap gap-2 items-center", children: [["7d", "30d", "90d", "custom"].map((r) => (_jsx("button", { onClick: () => setRange(r), className: `rounded-lg border px-3 py-1.5 text-sm transition-colors ${range === r
                                    ? "border-primary-500 bg-primary-50 text-primary-700 font-medium"
                                    : "border-slate-200 text-slate-600 hover:border-slate-300"}`, children: r === "custom" ? "Custom" : `Last ${r}` }, r))), range === "custom" && (_jsxs("div", { className: "flex gap-2", children: [_jsx(Input, { type: "date", value: customFrom, onChange: (e) => setCustomFrom(e.target.value), className: "w-36 text-xs" }), _jsx(Input, { type: "date", value: customTo, onChange: (e) => setCustomTo(e.target.value), className: "w-36 text-xs" })] }))] })] }), isLoading ? (_jsx(PageSpinner, {})) : !reports ? (_jsx("div", { className: "py-16 text-center text-slate-400", children: "No data available" })) : (_jsxs("div", { className: "space-y-8", children: [_jsxs("section", { children: [_jsx("h2", { className: "mb-3 font-semibold text-slate-700", children: "Overview" }), _jsxs("div", { className: "grid grid-cols-2 gap-4 sm:grid-cols-4", children: [_jsx(StatCard, { label: "Total Customers", value: reports.customers_total, color: "bg-blue-50" }), _jsx(StatCard, { label: "Total Listings", value: Object.values(reports.listings_by_status).reduce((a, b) => a + b, 0), color: "bg-indigo-50" }), _jsx(StatCard, { label: "Total Vendors", value: Object.values(reports.vendors_by_status).reduce((a, b) => a + b, 0), color: "bg-emerald-50" }), _jsx(StatCard, { label: "Total Bookings", value: Object.values(reports.bookings_by_status).reduce((a, b) => a + b, 0), color: "bg-amber-50" })] })] }), _jsxs("section", { children: [_jsx("h2", { className: "mb-3 font-semibold text-slate-700", children: "Listings by Status" }), _jsx("div", { className: "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6", children: Object.entries(reports.listings_by_status).map(([status, count]) => (_jsxs("div", { className: "rounded-lg bg-white p-4 shadow-sm text-center", children: [_jsx("div", { className: "text-2xl font-bold text-slate-900", children: count }), _jsx("div", { className: "mt-1 text-xs text-slate-500 capitalize", children: status.replace(/_/g, " ") })] }, status))) })] }), _jsxs("section", { children: [_jsx("h2", { className: "mb-3 font-semibold text-slate-700", children: "Listings by Type" }), _jsx("div", { className: "grid grid-cols-3 gap-3", children: Object.entries(reports.listings_by_type).map(([type, count]) => (_jsxs("div", { className: "rounded-lg bg-white p-4 shadow-sm text-center", children: [_jsx("div", { className: "text-2xl font-bold text-slate-900", children: count }), _jsx("div", { className: "mt-1 text-xs text-slate-500 capitalize", children: type })] }, type))) })] }), _jsxs("section", { children: [_jsx("h2", { className: "mb-3 font-semibold text-slate-700", children: "Vendors by Status" }), _jsx("div", { className: "grid grid-cols-3 gap-3", children: Object.entries(reports.vendors_by_status).map(([status, count]) => (_jsxs("div", { className: "rounded-lg bg-white p-4 shadow-sm text-center", children: [_jsx("div", { className: "text-2xl font-bold text-slate-900", children: count }), _jsx("div", { className: "mt-1 text-xs text-slate-500 capitalize", children: status })] }, status))) })] }), _jsxs("section", { children: [_jsx("h2", { className: "mb-3 font-semibold text-slate-700", children: "Bookings by Status" }), _jsx("div", { className: "grid grid-cols-2 gap-3 sm:grid-cols-4", children: Object.entries(reports.bookings_by_status).map(([status, count]) => (_jsxs("div", { className: "rounded-lg bg-white p-4 shadow-sm text-center", children: [_jsx("div", { className: "text-2xl font-bold text-slate-900", children: count }), _jsx("div", { className: "mt-1 text-xs text-slate-500 capitalize", children: status.replace(/_/g, " ") })] }, status))) })] })] }))] }));
}
