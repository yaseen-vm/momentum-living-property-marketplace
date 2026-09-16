import { clsx } from "clsx";

type BadgeVariant =
  | "pending"
  | "approved"
  | "rejected"
  | "draft"
  | "rented_sold"
  | "withdrawn"
  | "owner_confirmed"
  | "customer_contacted"
  | "closed"
  | "default";

const variantClasses: Record<BadgeVariant, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  draft: "bg-slate-100 text-slate-600",
  rented_sold: "bg-purple-100 text-purple-800",
  withdrawn: "bg-slate-200 text-slate-500",
  owner_confirmed: "bg-blue-100 text-blue-800",
  customer_contacted: "bg-indigo-100 text-indigo-800",
  closed: "bg-green-200 text-green-900",
  default: "bg-slate-100 text-slate-700",
};

const labelMap: Partial<Record<BadgeVariant, string>> = {
  rented_sold: "Rented/Sold",
  owner_confirmed: "Owner Confirmed",
  customer_contacted: "Customer Contacted",
};

interface BadgeProps {
  status: string;
  className?: string;
}

export function Badge({ status, className }: BadgeProps) {
  const variant = (status as BadgeVariant) in variantClasses ? (status as BadgeVariant) : "default";
  const label = labelMap[variant] ?? status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
    >
      {label}
    </span>
  );
}
