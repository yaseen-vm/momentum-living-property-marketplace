import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ExternalLink, Plus, Upload, X } from "lucide-react";
import { clsx } from "clsx";
import { FEATURE_ICONS, SITE_CONTENT_KEYS, SITE_CONTENT_SCHEMAS } from "@momentum/shared";
import type { SiteContent, SiteContentKey } from "@momentum/shared";
import { api, publicMediaUrl } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { PageSpinner } from "../../components/ui/Spinner";
import { AdminCard, AdminField, AdminPage, ErrorBox, adminInputClass, formatDateTime, useAdminToken } from "../../components/admin/AdminUi";

// ─── Field specs: one editor per site_content key ───────────────────────────

type Obj = Record<string, unknown>;

type Spec =
  | { kind: "text"; key: string; label: string; hint?: string }
  | { kind: "textarea"; key: string; label: string; hint?: string; rows?: number }
  | { kind: "boolean"; key: string; label: string; hint?: string }
  | { kind: "select"; key: string; label: string; options: Array<{ value: string; label: string }> }
  | { kind: "image"; key: string; label: string; area: "md" | "site"; hint?: string }
  | { kind: "strings"; key: string; label: string; itemLabel: string }
  | { kind: "items"; key: string; label: string; itemLabel: string; fields: Spec[]; empty: Obj }
  | { kind: "group"; key: string; label: string; fields: Spec[] };

const titledText: Spec[] = [
  { kind: "text", key: "title", label: "Title" },
  { kind: "textarea", key: "text", label: "Text", rows: 2 },
];
const paragraphsHint = "Separate paragraphs with a blank line.";
const legal: Spec[] = [
  {
    kind: "textarea",
    key: "body_markdown",
    label: "Wording",
    rows: 18,
    hint: "Use “## Heading” for headings and “- item” for list items. Shown as plain text, never HTML.",
  },
  { kind: "text", key: "updated_on", label: "Last updated (display date)", hint: "e.g. 21 September 2026" },
];
const url = (key: string, label: string): Spec => ({ kind: "text", key, label, hint: "Full https:// address, or empty to hide." });

const EDITORS: Record<SiteContentKey, { label: string; path: string | null; fields: Spec[] }> = {
  home: {
    label: "Home",
    path: "/",
    fields: [
      { kind: "textarea", key: "about_intro", label: "About the company (Home)", rows: 4 },
      { kind: "strings", key: "audiences", label: "Who we work with", itemLabel: "Audience" },
    ],
  },
  about: {
    label: "About Us",
    path: "/about",
    fields: [
      { kind: "textarea", key: "who_we_are", label: "Who we are", rows: 4, hint: paragraphsHint },
      { kind: "items", key: "what_we_do", label: "What we do", itemLabel: "Service", fields: titledText, empty: { title: "", text: "" } },
      { kind: "items", key: "who_we_work_with", label: "Who we work with", itemLabel: "Audience", fields: titledText, empty: { title: "", text: "" } },
      { kind: "textarea", key: "why_us", label: "Why Momentum Living", rows: 4, hint: paragraphsHint },
      { kind: "items", key: "approach_steps", label: "Our approach", itemLabel: "Step", fields: titledText, empty: { title: "", text: "" } },
    ],
  },
  why_choose_us: {
    label: "Why Choose Us",
    path: "/why-choose-us",
    fields: [
      { kind: "textarea", key: "intro", label: "Introduction", rows: 3 },
      {
        kind: "items",
        key: "features",
        label: "Reasons",
        itemLabel: "Reason",
        empty: { title: "", summary: "", text: "", icon: "compass" },
        fields: [
          { kind: "text", key: "title", label: "Title" },
          { kind: "select", key: "icon", label: "Icon", options: FEATURE_ICONS.map((i) => ({ value: i, label: i })) },
          { kind: "text", key: "summary", label: "Summary (Home page card)" },
          { kind: "textarea", key: "text", label: "Text (Why Choose Us page)", rows: 2 },
        ],
      },
    ],
  },
  md_profile: {
    label: "Managing Director",
    path: "/managing-director",
    fields: [
      { kind: "text", key: "name", label: "Name" },
      { kind: "text", key: "title", label: "Title" },
      { kind: "image", key: "photo_key", label: "Portrait", area: "md", hint: "Portrait orientation (4:5) works best." },
      { kind: "textarea", key: "biography", label: "Biography", rows: 5, hint: paragraphsHint },
      { kind: "textarea", key: "experience", label: "Experience", rows: 4 },
      { kind: "textarea", key: "philosophy", label: "Leadership philosophy", rows: 4 },
      { kind: "textarea", key: "vision", label: "Vision for Momentum Living", rows: 4 },
      { kind: "textarea", key: "commitment_clients", label: "Commitment to clients", rows: 3 },
      { kind: "textarea", key: "commitment_standards", label: "Commitment to professional standards", rows: 3 },
      { kind: "textarea", key: "market_vision", label: "Vision for the labour accommodation market", rows: 3 },
    ],
  },
  md_note: {
    label: "MD's Note",
    path: "/managing-director/note",
    fields: [
      { kind: "text", key: "heading", label: "Heading" },
      { kind: "textarea", key: "body", label: "Message", rows: 14, hint: paragraphsHint },
      { kind: "text", key: "signature_name", label: "Signature name" },
    ],
  },
  company: {
    label: "Company & Contact",
    path: "/contact",
    fields: [
      { kind: "text", key: "phone", label: "Phone", hint: "International format, e.g. +971 4 123 4567" },
      { kind: "text", key: "whatsapp", label: "WhatsApp number", hint: "International format; used for wa.me links." },
      { kind: "text", key: "email", label: "Main email" },
      { kind: "text", key: "general_email", label: "General enquiries email" },
      { kind: "text", key: "sales_email", label: "Sales email" },
      { kind: "text", key: "management_email", label: "Management email" },
      { kind: "textarea", key: "address", label: "Office address", rows: 2 },
      { kind: "text", key: "working_hours", label: "Working hours" },
      {
        kind: "group",
        key: "socials",
        label: "Social links",
        fields: [
          url("linkedin", "LinkedIn"),
          url("instagram", "Instagram"),
          {
            kind: "items",
            key: "other",
            label: "Other links",
            itemLabel: "Link",
            empty: { label: "", url: "" },
            fields: [
              { kind: "text", key: "label", label: "Label" },
              url("url", "Address"),
            ],
          },
        ],
      },
    ],
  },
  legal_privacy: { label: "Privacy Policy", path: "/privacy", fields: legal },
  legal_terms: { label: "Terms & Conditions", path: "/terms", fields: legal },
  availability_config: {
    label: "Availability settings",
    path: "/availability",
    fields: [
      { kind: "boolean", key: "enable_buyer", label: "Offer “Buyer” in Step 1" },
      { kind: "boolean", key: "enable_seller", label: "Offer “Seller” in Step 1" },
      {
        kind: "select",
        key: "nationality_field",
        label: "Nationality field (individual enquirers)",
        options: [
          { value: "hidden", label: "Hidden" },
          { value: "optional", label: "Optional" },
          { value: "required", label: "Required" },
        ],
      },
    ],
  },
};

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AdminContentPage() {
  const token = useAdminToken();
  const [params, setParams] = useSearchParams();
  const requested = params.get("key");
  const active: SiteContentKey = (SITE_CONTENT_KEYS as readonly string[]).includes(requested ?? "")
    ? (requested as SiteContentKey)
    : "home";

  const content = useQuery({ queryKey: ["admin-content"], queryFn: () => api.admin.content(token) });
  const [dirty, setDirty] = useState(false);

  function choose(key: SiteContentKey) {
    if (key === active) return;
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    setDirty(false);
    setParams({ key }, { replace: true });
  }

  return (
    <AdminPage title="Corporate content" description="Changes appear on the public site within about five minutes (edge cache).">
      <ErrorBox error={content.error} />
      <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
        <nav aria-label="Content sections" className="flex gap-1 overflow-x-auto lg:flex-col">
          {SITE_CONTENT_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => choose(key)}
              aria-current={key === active ? "page" : undefined}
              className={clsx(
                "whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-medium",
                key === active ? "bg-navy-800 text-white" : "text-slate-600 hover:bg-white"
              )}
            >
              {EDITORS[key].label}
            </button>
          ))}
        </nav>

        {content.isPending ? (
          <PageSpinner />
        ) : content.data ? (
          <ContentEditor
            key={active}
            contentKey={active}
            initial={content.data.items[active].value}
            updatedAt={content.data.items[active].updated_at}
            onDirtyChange={setDirty}
          />
        ) : null}
      </div>
    </AdminPage>
  );
}

function ContentEditor<K extends SiteContentKey>({
  contentKey,
  initial,
  updatedAt,
  onDirtyChange,
}: {
  contentKey: K;
  initial: SiteContent[K];
  updatedAt: number | null;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const token = useAdminToken();
  const qc = useQueryClient();
  const editor = EDITORS[contentKey];
  const [value, setValue] = useState<Obj>(initial as unknown as Obj);
  const [validation, setValidation] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(value) !== JSON.stringify(initial);

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  const save = useMutation({
    mutationFn: (v: SiteContent[K]) => api.admin.updateContent(contentKey, v, token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-content"] });
      void qc.invalidateQueries({ queryKey: ["content"] });
      setSaved(true);
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    const parsed = SITE_CONTENT_SCHEMAS[contentKey].safeParse(value);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setValidation(issue ? `${describePath(editor.fields, issue.path)}: ${issue.message}` : "Invalid content");
      return;
    }
    setValidation(null);
    save.mutate(parsed.data as SiteContent[K]);
  }

  return (
    <form onSubmit={submit} noValidate>
      <AdminCard
        title={editor.label}
        actions={
          editor.path && (
            <a href={editor.path} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-navy-600 hover:underline">
              View page <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          )
        }
      >
        <p className="mb-5 text-xs text-slate-500">
          {updatedAt ? `Last saved ${formatDateTime(updatedAt)}` : "Showing placeholder content; not yet saved."} Placeholders in
          [BRACKETS] are shown as text and never as links.
        </p>
        <Fields specs={editor.fields} value={value} onChange={setValue} idPrefix={contentKey} />
      </AdminCard>

      <div className="sticky bottom-16 mt-4 flex flex-wrap items-center justify-end gap-3 rounded-xl bg-white/95 p-3 shadow-sm lg:bottom-0">
        {validation && <p className="mr-auto text-sm text-red-600">{validation}</p>}
        {save.error && <p className="mr-auto text-sm text-red-600">{save.error.message}</p>}
        {saved && !dirty && <p className="mr-auto text-sm text-green-700">Saved.</p>}
        <Button type="button" variant="secondary" disabled={!dirty} onClick={() => setValue(initial as unknown as Obj)}>
          Discard changes
        </Button>
        <Button type="submit" loading={save.isPending} disabled={!dirty}>
          Save {editor.label}
        </Button>
      </div>
    </form>
  );
}

/** Readable location for a validation issue, e.g. "Reasons 3 › Summary". */
function describePath(specs: Spec[], path: Array<string | number>): string {
  const parts: string[] = [];
  let current: Spec[] = specs;
  let itemLabel = "";
  for (const segment of path) {
    if (typeof segment === "number") {
      parts.push(`${itemLabel} ${segment + 1}`);
      continue;
    }
    const spec = current.find((s) => s.key === segment);
    if (!spec) break;
    if (spec.kind === "items" || spec.kind === "strings") itemLabel = spec.itemLabel;
    else parts.push(spec.label);
    current = spec.kind === "items" || spec.kind === "group" ? spec.fields : [];
  }
  return parts.join(" › ") || "Content";
}

// ─── Recursive field renderer ───────────────────────────────────────────────

function Fields({ specs, value, onChange, idPrefix }: { specs: Spec[]; value: Obj; onChange: (v: Obj) => void; idPrefix: string }) {
  return (
    <div className="space-y-5">
      {specs.map((spec) => (
        <FieldEditor
          key={spec.key}
          spec={spec}
          value={value[spec.key]}
          onChange={(v) => onChange({ ...value, [spec.key]: v })}
          id={`${idPrefix}-${spec.key}`}
        />
      ))}
    </div>
  );
}

function FieldEditor({ spec, value, onChange, id }: { spec: Spec; value: unknown; onChange: (v: unknown) => void; id: string }) {
  switch (spec.kind) {
    case "text":
      return (
        <AdminField label={spec.label} htmlFor={id} hint={spec.hint}>
          <input id={id} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={adminInputClass} />
        </AdminField>
      );
    case "textarea":
      return (
        <AdminField label={spec.label} htmlFor={id} hint={spec.hint}>
          <textarea
            id={id}
            rows={spec.rows ?? 3}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            className={adminInputClass}
          />
        </AdminField>
      );
    case "boolean":
      return (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          {spec.label}
        </label>
      );
    case "select":
      return (
        <AdminField label={spec.label} htmlFor={id}>
          <select id={id} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={adminInputClass}>
            {spec.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </AdminField>
      );
    case "image":
      return <ImageField spec={spec} value={String(value ?? "")} onChange={onChange} />;
    case "strings": {
      const list = Array.isArray(value) ? (value as string[]) : [];
      return (
        <ListShell label={spec.label} itemLabel={spec.itemLabel} onAdd={() => onChange([...list, ""])}>
          {list.map((item, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={item}
                aria-label={`${spec.itemLabel} ${i + 1}`}
                onChange={(e) => onChange(list.map((x, j) => (j === i ? e.target.value : x)))}
                className={adminInputClass}
              />
              <ItemControls index={i} count={list.length} list={list} onChange={onChange} label={spec.itemLabel} />
            </div>
          ))}
        </ListShell>
      );
    }
    case "items": {
      const list = Array.isArray(value) ? (value as Obj[]) : [];
      return (
        <ListShell label={spec.label} itemLabel={spec.itemLabel} onAdd={() => onChange([...list, { ...spec.empty }])}>
          {list.map((item, i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {spec.itemLabel} {i + 1}
                </span>
                <ItemControls index={i} count={list.length} list={list} onChange={onChange} label={spec.itemLabel} />
              </div>
              <Fields
                specs={spec.fields}
                value={item}
                onChange={(v) => onChange(list.map((x, j) => (j === i ? v : x)))}
                idPrefix={`${id}-${i}`}
              />
            </div>
          ))}
        </ListShell>
      );
    }
    case "group":
      return (
        <fieldset className="rounded-lg border border-slate-200 p-4">
          <legend className="px-1 text-sm font-medium text-slate-700">{spec.label}</legend>
          <Fields specs={spec.fields} value={(value ?? {}) as Obj} onChange={onChange} idPrefix={id} />
        </fieldset>
      );
  }
}

function ListShell({ label, itemLabel, onAdd, children }: { label: string; itemLabel: string; onAdd: () => void; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-700">{label}</p>
      <div className="space-y-3">{children}</div>
      <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={onAdd}>
        <Plus className="h-4 w-4" aria-hidden /> Add {itemLabel.toLowerCase()}
      </Button>
    </div>
  );
}

function ItemControls<T>({ index, count, list, onChange, label }: { index: number; count: number; list: T[]; onChange: (v: T[]) => void; label: string }) {
  const move = (delta: number) => {
    const next = [...list];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item!);
    onChange(next);
  };
  const btn = "rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-30";
  return (
    <div className="flex shrink-0 gap-1">
      <button type="button" className={btn} aria-label={`Move ${label} ${index + 1} up`} disabled={index === 0} onClick={() => move(-1)}>
        <ArrowUp className="h-4 w-4" aria-hidden />
      </button>
      <button type="button" className={btn} aria-label={`Move ${label} ${index + 1} down`} disabled={index === count - 1} onClick={() => move(1)}>
        <ArrowDown className="h-4 w-4" aria-hidden />
      </button>
      <button type="button" className={btn} aria-label={`Remove ${label} ${index + 1}`} onClick={() => onChange(list.filter((_, j) => j !== index))}>
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

function ImageField({ spec, value, onChange }: { spec: Extract<Spec, { kind: "image" }>; value: string; onChange: (v: string) => void }) {
  const token = useAdminToken();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = value ? publicMediaUrl(value) : null;

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const { key } = await api.upload.uploadFile(file, "public_media", token, { area: spec.area });
      onChange(key);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <AdminField label={spec.label} hint={spec.hint} error={error ?? undefined}>
      <div className="flex items-center gap-4">
        <div className="h-28 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">
          {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-xs text-slate-400">No image</span>}
        </div>
        <div className="space-y-1">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
            <Upload className="h-4 w-4" aria-hidden /> {uploading ? "Uploading…" : value ? "Replace" : "Upload"}
            <input
              type="file"
              className="sr-only"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
                e.target.value = "";
              }}
            />
          </label>
          {value && (
            <button type="button" onClick={() => onChange("")} className="block text-xs text-slate-500 hover:underline">
              Remove image
            </button>
          )}
        </div>
      </div>
    </AdminField>
  );
}
