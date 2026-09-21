import { clsx } from "clsx";
import { LEAD_STATUS_LABELS, PROPERTY_STATUS_LABELS } from "@momentum/shared";

const variantClasses: Record<string, string> = {
  // Properties (and legacy vendor listing statuses)
  draft: "bg-slate-100 text-slate-600",
  approved: "bg-green-100 text-green-800",
  archived: "bg-slate-200 text-slate-500",
  pending: "bg-yellow-100 text-yellow-800",
  rejected: "bg-red-100 text-red-800",
  rented_sold: "bg-purple-100 text-purple-800",
  withdrawn: "bg-slate-200 text-slate-500",
  // Leads
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-indigo-100 text-indigo-800",
  qualified: "bg-cyan-100 text-cyan-800",
  matching: "bg-teal-100 text-teal-800",
  viewing_requested: "bg-amber-100 text-amber-800",
  negotiation: "bg-orange-100 text-orange-800",
  closed: "bg-green-100 text-green-800",
  not_proceeding: "bg-slate-200 text-slate-600",
};

const labels: Record<string, string> = { ...PROPERTY_STATUS_LABELS, ...LEAD_STATUS_LABELS };

interface BadgeProps {
  status: string;
  className?: string;
}

/** Status pill for lead and property statuses; unknown values render neutral. */
export function Badge({ status, className }: BadgeProps) {
  const label = labels[status] ?? status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span
      className={clsx(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[status] ?? "bg-slate-100 text-slate-700",
        className
      )}
    >
      {label}
    </span>
  );
}
