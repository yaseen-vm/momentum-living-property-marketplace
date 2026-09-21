import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import type { UseFormRegisterReturn } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowUp, Lock, Plus, Upload, X } from "lucide-react";
import {
  EMIRATES,
  FACILITIES,
  LOCATIONS,
  OPPORTUNITY_KINDS,
  OPPORTUNITY_KIND_LABELS,
  PRICE_PERIODS,
  PRICE_PERIOD_LABELS,
  PROPERTY_STATUSES,
  PROPERTY_STATUS_LABELS,
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  locationLabel,
  propertySchema,
} from "@momentum/shared";
import type { AdminPropertyDetail, OpportunityKind, PropertyInput, PropertyType } from "@momentum/shared";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { PageSpinner } from "../../components/ui/Spinner";
import {
  AdminCard,
  AdminField,
  AdminPage,
  ErrorBox,
  adminInputClass,
  fromDateInput,
  toDateInput,
  useAdminToken,
} from "../../components/admin/AdminUi";

/** Extra facility suggestions per property type; labour-camp facilities come from the shared catalogue. */
const EXTRA_FACILITIES: Record<PropertyType, string[]> = {
  labour_camp: [],
  warehouse: ["Electricity (3-phase)", "Water Supply", "Fire Suppression", "Office Space", "Mezzanine Floor", "Roller Shutter", "Racking System"],
  land: ["Road Access", "Electricity Connection", "Water Connection", "Sewage Connection", "Boundary Wall", "Corner Plot"],
};

const NUMBER_FIELDS = [
  "price",
  "latitude",
  "longitude",
  "size_sqft",
  "num_rooms",
  "persons_per_room",
  "room_size_sqft",
  "total_capacity",
  "num_loading_bays",
  "year_built",
  "security_deposit_pct",
  "commission_pct",
  "ejari_fee",
  "admin_fee",
] as const;
const TEXT_FIELDS = [
  "reference_no",
  "title",
  "summary",
  "description",
  "terms",
  "location_text",
  "owner_name",
  "owner_contact",
  "internal_notes",
] as const;
const BOOLEAN_FIELDS = ["is_available", "show_price", "show_map", "mohre_certified", "ejari_registered", "freehold"] as const;

type NumberField = (typeof NUMBER_FIELDS)[number];
type TextField = (typeof TEXT_FIELDS)[number];
type BooleanField = (typeof BOOLEAN_FIELDS)[number];

/** Form model: inputs hold strings; converted to `PropertyInput` on submit. */
type FormValues = Record<NumberField | TextField, string> &
  Record<BooleanField, boolean> & {
    opportunity_kind: OpportunityKind;
    type: PropertyType;
    status: (typeof PROPERTY_STATUSES)[number];
    price_period: string;
    currency: "AED" | "USD";
    location_slug: string;
    availability_date: string;
    assigned_agent_id: string;
    amenities: string[];
  };

interface Photo {
  key: string;
  url: string;
  alt_text: string;
  uploading?: boolean;
}

const EMPTY: FormValues = {
  ...(Object.fromEntries([...NUMBER_FIELDS, ...TEXT_FIELDS].map((f) => [f, ""])) as Record<NumberField | TextField, string>),
  is_available: true,
  show_price: true,
  show_map: false,
  mohre_certified: false,
  ejari_registered: false,
  freehold: false,
  opportunity_kind: "accommodation_lease",
  type: "labour_camp",
  status: "draft",
  price_period: "year",
  currency: "AED",
  location_slug: "",
  availability_date: "",
  assigned_agent_id: "",
  amenities: [],
};

function toForm(p: AdminPropertyDetail): FormValues {
  const values = { ...EMPTY };
  for (const f of NUMBER_FIELDS) values[f] = p[f] === null ? "" : String(p[f]);
  for (const f of TEXT_FIELDS) values[f] = p[f] ?? "";
  for (const f of BOOLEAN_FIELDS) values[f] = p[f];
  return {
    ...values,
    opportunity_kind: p.opportunity_kind,
    type: p.type,
    // Vendor-era statuses (pending, rejected, …) show as draft until the admin publishes.
    status: (PROPERTY_STATUSES as readonly string[]).includes(p.status) ? (p.status as FormValues["status"]) : "draft",
    price_period: p.price_period ?? "",
    currency: p.currency as FormValues["currency"],
    location_slug: p.location_slug,
    availability_date: toDateInput(p.availability_date),
    assigned_agent_id: p.assigned_agent_id ?? "",
    amenities: p.amenities,
  };
}

function toInput(v: FormValues, photos: Photo[]): PropertyInput {
  const input: Record<string, unknown> = {
    opportunity_kind: v.opportunity_kind,
    type: v.type,
    status: v.status,
    currency: v.currency,
    location_slug: v.location_slug,
    price_period: v.price_period || null,
    availability_date: fromDateInput(v.availability_date) ?? null,
    assigned_agent_id: v.assigned_agent_id || null,
    amenities: v.amenities,
    photos: photos.filter((p) => p.key).map((p) => ({ key: p.key, alt_text: p.alt_text })),
  };
  for (const f of NUMBER_FIELDS) input[f] = v[f].trim() === "" ? null : Number(v[f]);
  for (const f of TEXT_FIELDS) input[f] = v[f];
  for (const f of BOOLEAN_FIELDS) input[f] = v[f];
  return input as PropertyInput;
}

export default function AdminPropertyFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const token = useAdminToken();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const existing = useQuery({
    queryKey: ["admin-property", id],
    queryFn: () => api.admin.property(id!, token),
    enabled: isEdit,
  });
  const agents = useQuery({ queryKey: ["admin-agents"], queryFn: () => api.admin.agents(token) });

  const form = useForm<FormValues>({ defaultValues: EMPTY });
  const { register, watch, setValue, reset, setError, handleSubmit, formState } = form;
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [customFacility, setCustomFacility] = useState("");

  useEffect(() => {
    if (!existing.data) return;
    reset(toForm(existing.data));
    setPhotos(existing.data.photos.map((p) => ({ key: p.key, url: p.url, alt_text: p.alt_text ?? "" })));
  }, [existing.data, reset]);

  const save = useMutation({
    mutationFn: (input: PropertyInput) =>
      isEdit ? api.admin.updateProperty(id!, input, token).then((p) => p.id) : api.admin.createProperty(input, token).then((r) => r.id),
    onSuccess: (savedId) => {
      void qc.invalidateQueries({ queryKey: ["admin-properties"] });
      void qc.invalidateQueries({ queryKey: ["admin-property", savedId] });
      navigate("/admin/properties");
    },
  });

  const onSubmit = handleSubmit((values) => {
    if (photos.some((p) => p.uploading)) {
      setPhotoError("Wait for the photos to finish uploading.");
      return;
    }
    const input = toInput(values, photos);
    const parsed = propertySchema.safeParse(input);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "photos") setPhotoError(issue.message);
        else if (typeof field === "string") setError(field as keyof FormValues, { message: issue.message });
      }
      return;
    }
    save.mutate(input);
  });

  async function uploadPhotos(files: File[]) {
    setPhotoError(null);
    for (const file of files.slice(0, 20 - photos.length)) {
      const url = URL.createObjectURL(file);
      setPhotos((p) => [...p, { key: "", url, alt_text: "", uploading: true }]);
      try {
        const { key } = await api.upload.uploadFile(file, "listing_photo", token);
        setPhotos((p) => p.map((ph) => (ph.url === url ? { ...ph, key, uploading: false } : ph)));
      } catch (e) {
        setPhotos((p) => p.filter((ph) => ph.url !== url));
        setPhotoError(`Upload failed: ${e instanceof Error ? e.message : "unknown error"}`);
      }
    }
  }

  function movePhoto(index: number, delta: number) {
    setPhotos((p) => {
      const next = [...p];
      const [item] = next.splice(index, 1);
      next.splice(index + delta, 0, item!);
      return next;
    });
  }

  if (isEdit && existing.isPending) return <PageSpinner />;
  if (isEdit && !existing.data) {
    return (
      <AdminPage title="Edit property">
        <ErrorBox error={existing.error ?? "Property not found"} />
      </AdminPage>
    );
  }

  const type = watch("type");
  const amenities = watch("amenities");
  const facilityOptions = [...new Set([...FACILITIES.map((f) => f.label), ...EXTRA_FACILITIES[type], ...amenities])];
  const err = (name: keyof FormValues) => formState.errors[name]?.message;

  const text = (name: TextField, label: string, opts: { hint?: string; placeholder?: string; className?: string } = {}) => (
    <AdminField label={label} htmlFor={`p-${name}`} hint={opts.hint} error={err(name)} className={opts.className}>
      <input id={`p-${name}`} placeholder={opts.placeholder} className={adminInputClass} {...register(name)} />
    </AdminField>
  );
  const textarea = (name: TextField, label: string, rows: number, hint?: string) => (
    <AdminField label={label} htmlFor={`p-${name}`} hint={hint} error={err(name)} className="sm:col-span-2">
      <textarea id={`p-${name}`} rows={rows} className={adminInputClass} {...register(name)} />
    </AdminField>
  );
  const number = (name: NumberField, label: string, opts: { hint?: string; step?: string } = {}) => (
    <AdminField label={label} htmlFor={`p-${name}`} hint={opts.hint} error={err(name)}>
      <input id={`p-${name}`} type="number" inputMode="decimal" step={opts.step ?? "any"} className={adminInputClass} {...register(name)} />
    </AdminField>
  );
  const checkbox = (name: BooleanField, label: string, hint?: string) => (
    <Checkbox label={label} hint={hint} registration={register(name)} />
  );

  return (
    <AdminPage
      title={isEdit ? `Edit ${existing.data?.reference_no ?? "property"}` : "New property / opportunity"}
      description={isEdit ? existing.data?.title : "Published and available records are matched to qualified enquiries."}
      actions={
        <Link to="/admin/properties" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" aria-hidden /> All properties
        </Link>
      }
    >
      <form onSubmit={(e) => void onSubmit(e)} noValidate className="space-y-6">
        <AdminCard title="Record">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Opportunity kind" htmlFor="p-kind" hint="Decides which enquirers can be matched to it.">
              <select id="p-kind" className={adminInputClass} {...register("opportunity_kind")}>
                {OPPORTUNITY_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {OPPORTUNITY_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </AdminField>
            <AdminField label="Property type" htmlFor="p-type">
              <select id="p-type" className={adminInputClass} {...register("type")}>
                {PROPERTY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {PROPERTY_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </AdminField>
            {text("reference_no", "Reference number", { placeholder: "Generated if empty, e.g. ML-LC-0042", hint: "Shown to enquirers on cards." })}
            <AdminField label="Status" htmlFor="p-status" hint="Drafts and archived records never match.">
              <select id="p-status" className={adminInputClass} {...register("status")}>
                {PROPERTY_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {PROPERTY_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </AdminField>
            <AdminField label="Assigned agent" htmlFor="p-agent" hint="Shown to enquirers as the contact for this opportunity.">
              <select id="p-agent" className={adminInputClass} {...register("assigned_agent_id")}>
                <option value="">None (any agent)</option>
                {(agents.data?.agents ?? [])
                  .filter((a) => a.is_active || a.id === existing.data?.assigned_agent_id)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                      {a.is_active ? "" : " (inactive)"}
                    </option>
                  ))}
              </select>
            </AdminField>
            <div className="flex items-end">{checkbox("is_available", "Available", "Unavailable records stay listed here but never match.")}</div>
          </div>
        </AdminCard>

        <AdminCard title="Shown to qualified enquirers">
          <div className="grid gap-4 sm:grid-cols-2">
            {text("title", "Title", { className: "sm:col-span-2", placeholder: "e.g. Labour accommodation, 300 persons, Al Quoz" })}
            {textarea("summary", "Card summary", 2, "One or two lines on the opportunity card.")}
            {textarea("description", "Description", 5)}
            {textarea("terms", "Commercial terms", 3, "Free text on the detail page, e.g. payment terms or minimum contract.")}
          </div>
        </AdminCard>

        <AdminCard title="Location">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Area" htmlFor="p-location" error={err("location_slug")} hint="Location filters match on this area.">
              <select
                id="p-location"
                className={adminInputClass}
                {...register("location_slug", {
                  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
                    if (!form.getValues("location_text")) setValue("location_text", locationLabel(e.target.value));
                  },
                })}
              >
                <option value="">Choose an area</option>
                {EMIRATES.map((em) => (
                  <optgroup key={em.slug} label={em.label}>
                    {LOCATIONS.filter((l) => l.emirate === em.slug).map((l) => (
                      <option key={l.slug} value={l.slug}>
                        {l.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </AdminField>
            {text("location_text", "General location (shown)", { hint: "General area only. Never the exact address." })}
            {number("latitude", "Latitude", { hint: "Admin only unless the map is shown." })}
            {number("longitude", "Longitude")}
            <div className="sm:col-span-2">{checkbox("show_map", "Show map on the detail page", "Off by default; enquirers then see the general area only.")}</div>
          </div>
        </AdminCard>

        <AdminCard title="Capacity & specifications">
          <div className="grid gap-4 sm:grid-cols-3">
            {number("total_capacity", "Total capacity (persons)", { step: "1" })}
            {number("num_rooms", "Rooms", { step: "1" })}
            {number("persons_per_room", "Persons per room", { step: "1" })}
            {number("room_size_sqft", "Room size (sqft)")}
            {number("size_sqft", "Total area (sqft)", { step: "1" })}
            <AdminField label="Available from" htmlFor="p-date" error={err("availability_date")}>
              <input id="p-date" type="date" className={adminInputClass} {...register("availability_date")} />
            </AdminField>
            {type === "warehouse" && number("num_loading_bays", "Loading bays", { step: "1" })}
            {type === "warehouse" && number("year_built", "Year built", { step: "1" })}
          </div>
          <div className="mt-4 flex flex-wrap gap-6">
            {type === "labour_camp" && checkbox("mohre_certified", "MOHRE certified")}
            {type !== "land" && checkbox("ejari_registered", "Ejari registered")}
            {type === "land" && checkbox("freehold", "Freehold (unchecked = leasehold)")}
          </div>
        </AdminCard>

        <AdminCard title="Commercial">
          <div className="grid gap-4 sm:grid-cols-3">
            {number("price", "Price / rent")}
            <AdminField label="Price is" htmlFor="p-period">
              <select id="p-period" className={adminInputClass} {...register("price_period")}>
                <option value="">Not set</option>
                {PRICE_PERIODS.map((p) => (
                  <option key={p} value={p}>
                    {PRICE_PERIOD_LABELS[p]}
                  </option>
                ))}
              </select>
            </AdminField>
            <AdminField label="Currency" htmlFor="p-currency">
              <select id="p-currency" className={adminInputClass} {...register("currency")}>
                <option value="AED">AED</option>
                <option value="USD">USD</option>
              </select>
            </AdminField>
            {number("security_deposit_pct", "Security deposit (%)", { step: "0.5" })}
            {number("commission_pct", "Commission (%)", { step: "0.5" })}
            {number("ejari_fee", "Ejari fee")}
            {number("admin_fee", "Admin fee")}
          </div>
          <div className="mt-4">{checkbox("show_price", "Show price to enquirers", "Unchecked shows “Price on request”.")}</div>
        </AdminCard>

        <AdminCard title="Facilities">
          <div className="flex flex-wrap gap-2">
            {facilityOptions.map((label) => {
              const on = amenities.includes(label);
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setValue("amenities", on ? amenities.filter((a) => a !== label) : [...amenities, label])}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    on ? "border-navy-500 bg-navy-50 text-navy-800" : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex max-w-sm gap-2">
            <input
              value={customFacility}
              onChange={(e) => setCustomFacility(e.target.value)}
              placeholder="Add another facility"
              aria-label="Add another facility"
              maxLength={60}
              className={adminInputClass}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={!customFacility.trim()}
              onClick={() => {
                const label = customFacility.trim();
                if (label && !amenities.includes(label)) setValue("amenities", [...amenities, label]);
                setCustomFacility("");
              }}
            >
              <Plus className="h-4 w-4" aria-hidden /> Add
            </Button>
          </div>
          {err("amenities") && <p className="mt-2 text-xs text-red-600">{err("amenities")}</p>}
        </AdminCard>

        <AdminCard title={`Photos (${photos.length}/20)`}>
          <p className="mb-3 text-xs text-slate-500">The first photo is the cover. Describe each photo for accessibility and SEO.</p>
          <ul className="space-y-3">
            {photos.map((photo, i) => (
              <li key={photo.url} className="flex items-center gap-3">
                <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                  <img src={photo.url} alt="" className="h-full w-full object-cover" />
                  {photo.uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </div>
                  )}
                </div>
                <input
                  value={photo.alt_text}
                  onChange={(e) => setPhotos((p) => p.map((ph, j) => (j === i ? { ...ph, alt_text: e.target.value } : ph)))}
                  placeholder="Alt text, e.g. Accommodation block exterior"
                  aria-label={`Alt text for photo ${i + 1}`}
                  maxLength={200}
                  className={adminInputClass}
                />
                <div className="flex shrink-0 gap-1">
                  <IconButton label="Move up" disabled={i === 0} onClick={() => movePhoto(i, -1)} icon={ArrowUp} />
                  <IconButton label="Move down" disabled={i === photos.length - 1} onClick={() => movePhoto(i, 1)} icon={ArrowDown} />
                  <IconButton label="Remove photo" onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))} icon={X} />
                </div>
              </li>
            ))}
          </ul>
          {photos.length < 20 && (
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 hover:border-navy-400 hover:bg-navy-50">
              <Upload className="h-4 w-4" aria-hidden /> Add photos (JPEG, PNG or WebP, up to 10 MB)
              <input
                type="file"
                className="sr-only"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => {
                  void uploadPhotos(Array.from(e.target.files ?? []));
                  e.target.value = "";
                }}
              />
            </label>
          )}
          {photoError && <p className="mt-2 text-xs text-red-600">{photoError}</p>}
        </AdminCard>

        <AdminCard
          title="Confidential"
          actions={
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Lock className="h-3.5 w-3.5" aria-hidden /> Admin only, never shown to enquirers
            </span>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {text("owner_name", "Owner name")}
            {text("owner_contact", "Owner contact", { placeholder: "Phone, email or representative" })}
            {textarea("internal_notes", "Internal notes", 3)}
          </div>
        </AdminCard>

        <ErrorBox error={save.error} />
        {Object.keys(formState.errors).length > 0 && (
          <p role="alert" className="text-sm text-red-600">
            Please correct the highlighted fields.
          </p>
        )}
        <div className="flex justify-end gap-3 pb-6">
          <Button type="button" variant="secondary" onClick={() => navigate("/admin/properties")}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            {isEdit ? "Save changes" : "Create"}
          </Button>
        </div>
      </form>
    </AdminPage>
  );
}

function Checkbox({ label, hint, registration }: { label: string; hint?: string | undefined; registration: UseFormRegisterReturn }) {
  return (
    <label className="flex cursor-pointer items-start gap-2">
      <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-navy-600" {...registration} />
      <span>
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
    </label>
  );
}

function IconButton({
  label,
  icon: Icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: typeof X;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}
