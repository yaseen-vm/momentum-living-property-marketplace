import { NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, Users, LayoutList, CalendarCheck, Download, BarChart3, Bell, LogOut } from "lucide-react";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/auth";
import { clsx } from "clsx";

const NAV_ITEMS = [
  { to: "/admin/vendors", label: "Vendors", icon: Users },
  { to: "/admin/listings", label: "Listings", icon: LayoutList },
  { to: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { to: "/admin/export", label: "Export", icon: Download },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
];

export default function AdminLayout() {
  const { token, clearAuth } = useAuthStore();

  const { data: notifData } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () => api.admin.getNotifications(token!),
    enabled: !!token,
    refetchInterval: 30_000,
  });

  const unread = notifData?.unread_count ?? 0;

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-5">
          <Building2 className="h-7 w-7 text-primary-600" />
          <div>
            <div className="font-bold text-slate-900">Momentum</div>
            <div className="text-xs text-slate-500">Admin Panel</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary-50 text-primary-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
              {label === "Bookings" && unread > 0 && (
                <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                  {unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <button
            onClick={clearAuth}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary-600" />
          <span className="font-bold text-slate-900">Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="h-5 w-5 text-slate-500" />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-red-500 text-center text-xs leading-4 text-white">
                {unread}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white lg:hidden">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition-colors",
                isActive ? "text-primary-600" : "text-slate-500"
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto pt-14 pb-16 lg:pb-0 lg:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
