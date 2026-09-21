import { Link } from "react-router-dom";
import { clsx } from "clsx";
import { BRAND } from "../../lib/site";

interface BrandLogoProps {
  tone?: "dark" | "light";
  className?: string;
}

/** Wordmark: MOMENTUM LIVING primary, LABOURCAMPS.COM as the secondary identity (spec §2). */
export function BrandLogo({ tone = "dark", className }: BrandLogoProps) {
  return (
    <Link
      to="/"
      aria-label={`${BRAND.name} home`}
      className={clsx("group inline-flex flex-col leading-none", className)}
    >
      <span
        className={clsx(
          "font-serif text-lg font-semibold uppercase tracking-[0.16em] sm:text-xl",
          tone === "dark" ? "text-navy-900" : "text-white"
        )}
      >
        {BRAND.name}
      </span>
      <span className="mt-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-gold-500">
        <span className="h-px w-4 bg-gold-400" aria-hidden />
        {BRAND.domain}
      </span>
    </Link>
  );
}
