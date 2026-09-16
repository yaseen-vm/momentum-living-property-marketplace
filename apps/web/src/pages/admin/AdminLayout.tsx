import { NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LayoutList, Users, CalendarCheck, Download, BarChart3, Bell, LogOut } from "lucide-react";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/auth";
import { clsx } from "clsx";

const NAV_ITEMS = [
  { to: "/admin/vendors", label: "Owner Verification", icon: Users },
  { to: "/admin/listings", label: "Listing Approval", icon: LayoutList },
  { to: "/admin/bookings", label: "Booking Requests", icon: CalendarCheck },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin/export", label: "Export Data", icon: Download },
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
      <aside className="hidden w-64 shrink-0 flex-col lg:flex" style={{ backgroundColor: '#1D3B53' }}>
        <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
          <div>
            <div className="text-lg font-bold text-white italic font-serif">Momentum<span className="font-sans font-semibold not-italic">Living</span></div>
            <div className="text-xs text-slate-300 mt-0.5">Admin Portal</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/20 text-white"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
              {label === "Booking Requests" && unread > 0 && (
                <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                  {unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <button
            onClick={clearAuth}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <div className="text-base font-bold italic font-serif text-[#1D3B53]">
          Momentum<span className="font-sans font-semibold not-italic">Living</span>
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

      {/* Mobile bottom nav */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white lg:hidden">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition-colors",
                isActive ? "text-[#1D3B53]" : "text-slate-400"
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label.split(" ")[0]}
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
