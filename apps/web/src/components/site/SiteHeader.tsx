import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { clsx } from "clsx";
import { BrandLogo } from "./BrandLogo";
import { AVAILABILITY_PATH, NAV_ITEMS } from "../../lib/site";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  // Close the mobile menu on navigation.
  useEffect(() => setOpen(false), [pathname]);

  // Lock page scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-charcoal-100 bg-white">
      <div className="container-site flex h-20 items-center justify-between gap-6">
        <BrandLogo />

        <nav aria-label="Main" className="hidden items-center gap-7 xl:flex">
          {NAV_ITEMS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                clsx(
                  "relative py-2 text-sm font-medium transition-colors",
                  "after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:bg-gold-400 after:transition-transform",
                  isActive
                    ? "text-navy-900 after:scale-x-100"
                    : "text-charcoal-500 after:scale-x-0 hover:text-navy-900"
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link to={AVAILABILITY_PATH} className="btn-availability hidden px-5 py-2.5 sm:inline-flex">
            Availability
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-navy-900 hover:bg-navy-50 xl:hidden"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        id="mobile-nav"
        hidden={!open}
        className="fixed inset-x-0 bottom-0 top-20 overflow-y-auto border-t border-charcoal-100 bg-white xl:hidden"
      >
        <nav aria-label="Mobile" className="container-site flex flex-col py-6">
          {NAV_ITEMS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                clsx(
                  "border-b border-charcoal-100 py-4 font-serif text-xl transition-colors",
                  isActive ? "text-navy-900" : "text-charcoal-600 hover:text-navy-900"
                )
              }
            >
              {label}
            </NavLink>
          ))}
          <Link to={AVAILABILITY_PATH} className="btn-availability mt-8 w-full py-4">
            Availability
          </Link>
        </nav>
      </div>
    </header>
  );
}
