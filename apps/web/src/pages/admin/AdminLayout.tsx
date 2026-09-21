import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Bell, Building2, Download, FileText, Inbox, LogOut, UserRound } from "lucide-react";
import { clsx } from "clsx";
import { LEAD_REQUEST_KIND_LABELS, USER_TYPE_LABELS } from "@momentum/shared";
import type { AdminNotification, LeadNotificationPayload } from "@momentum/shared";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/auth";
import { formatDateTime, useAdminToken } from "../../components/admin/AdminUi";

const NAV_ITEMS = [
  { to: "/admin/leads", label: "Leads", icon: Inbox },
  { to: "/admin/properties", label: "Properties", icon: Building2 },
  { to: "/admin/agents", label: "Agents", icon: UserRound },
  { to: "/admin/content", label: "Content", icon: FileText },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin/export", label: "Export", icon: Download },
];

export default function AdminLayout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col bg-navy-900 lg:flex">
        <div className="border-b border-white/10 px-6 py-6">
          <div className="font-serif text-lg font-semibold text-white">Momentum Living</div>
          <div className="mt-0.5 text-xs uppercase tracking-wider text-gold-300">Admin</div>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                  isActive ? "bg-white/15 text-white" : "text-navy-200 hover:bg-white/10 hover:text-white"
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <button
            type="button"
            onClick={clearAuth}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm text-navy-200 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar: brand on mobile, notifications everywhere */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
          <div className="font-serif text-base font-semibold text-navy-900 lg:invisible">Momentum Living</div>
          <div className="flex items-center gap-1">
            <NotificationsMenu />
            <button
              type="button"
              onClick={clearAuth}
              aria-label="Sign out"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            >
              <LogOut className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </header>

        <main className="flex-1 pb-20 lg:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white lg:hidden">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors",
                isActive ? "text-navy-800" : "text-slate-400"
              )
            }
          >
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

/** One line describing a notification; `null` link for legacy types. */
function describe(n: AdminNotification): { text: string; to: string | null } {
  const p = n.payload as Partial<LeadNotificationPayload>;
  const to = p.enquiry_id ? `/admin/leads/${p.enquiry_id}` : null;
  if (n.type === "new_lead") {
    const type = p.user_type ? USER_TYPE_LABELS[p.user_type] : "";
    return { text: `New ${type} lead ${p.reference_no ?? ""}`.replace(/\s+/g, " "), to };
  }
  if (n.type === "lead_request") {
    const kind = p.kind ? LEAD_REQUEST_KIND_LABELS[p.kind] : "Information";
    const listing = p.listing_reference_no ? ` for ${p.listing_reference_no}` : "";
    return { text: `${kind} request${listing} · lead ${p.reference_no ?? ""}`, to };
  }
  return { text: n.type.replace(/_/g, " "), to: null };
}

function NotificationsMenu() {
  const token = useAdminToken();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () => api.admin.notifications(token),
    enabled: !!token,
    refetchInterval: 30_000,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-notifications"] });
  const markRead = useMutation({ mutationFn: (id: string) => api.admin.markNotificationRead(id, token), onSuccess: refresh });
  const markAll = useMutation({ mutationFn: () => api.admin.markAllNotificationsRead(token), onSuccess: refresh });

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const unread = data?.count ?? 0;
  const items = data?.items ?? [];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        aria-expanded={open}
        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] font-semibold leading-4 text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-40 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-semibold text-slate-900">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                className="text-xs font-medium text-navy-600 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-400">No notifications</li>}
            {items.map((n) => {
              const { text, to } = describe(n);
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!n.read_at) markRead.mutate(n.id);
                      if (to) {
                        navigate(to);
                        setOpen(false);
                      }
                    }}
                    className={clsx(
                      "flex w-full items-start gap-3 px-4 py-3 text-left text-sm hover:bg-slate-50",
                      !n.read_at && "bg-navy-50/60"
                    )}
                  >
                    <span
                      className={clsx("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-red-500")}
                      aria-hidden
                    />
                    <span>
                      <span className="block text-slate-800">{text}</span>
                      <span className="text-xs text-slate-400">{formatDateTime(n.created_at)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
