import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuthStore } from "../../store/auth";

/** Admin JWT. Admin pages render inside `ProtectedRoute`, so it is always present there. */
export function useAdminToken(): string {
  return useAuthStore((s) => s.token) ?? "";
}

export const adminInputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-500 disabled:bg-slate-50";

interface AdminPageProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function AdminPage({ title, description, actions, children }: AdminPageProps) {
  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function AdminCard({ title, actions, children, className = "" }: {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl bg-white p-5 shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="font-semibold text-slate-900">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : String(error);
  return (
    <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl bg-white py-16 text-center text-sm text-slate-400 shadow-sm">{children}</div>;
}

interface AdminFieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string | undefined;
  className?: string;
  children: React.ReactNode;
}

/** Label, control, hint and error for one admin form field. */
export function AdminField({ label, htmlFor, hint, error, className, children }: AdminFieldProps) {
  const Label = htmlFor ? "label" : "span";
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </Label>
      {children}
      {error ? (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

interface PaginationProps {
  total: number;
  limit: number;
  offset: number;
  onChange: (offset: number) => void;
}

export function Pagination({ total, limit, offset, onChange }: PaginationProps) {
  if (total <= limit) return null;
  const first = offset + 1;
  const last = Math.min(offset + limit, total);
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
      <span>
        {first}–{last} of {total}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(offset - limit, 0))}
          disabled={offset === 0}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden /> Previous
        </button>
        <button
          type="button"
          onClick={() => onChange(offset + limit)}
          disabled={last >= total}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40"
        >
          Next <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** `21 Sep 2026, 14:05`. */
export function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Local `YYYY-MM-DD` for a date input, or "" for null. */
export function toDateInput(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "";
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Start (or end) of a `YYYY-MM-DD` local day in Unix ms, or `undefined` when empty. */
export function fromDateInput(value: string, endOfDay = false): number | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  return endOfDay ? new Date(y!, m! - 1, d!, 23, 59, 59, 999).getTime() : new Date(y!, m! - 1, d!).getTime();
}
