import { useForm } from "react-hook-form";
import type { FieldErrors, Resolver, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { EMIRATES, FACILITIES, LOCATIONS, REQUIREMENTS_SCHEMAS, USER_TYPE_LABELS } from "@momentum/shared";
import type { UserType } from "@momentum/shared";
import { Chip, Field, inputClass } from "./Field";
import { REQUIREMENT_SECTIONS, requirementDefaults } from "./requirementFields";
import type { FieldDef } from "./requirementFields";

type Values = Record<string, unknown>;
type Form = UseFormReturn<Values>;

interface RequirementsStepProps {
  userType: UserType;
  companyName: string | null | undefined;
  referenceNo: string | null;
  submitting: boolean;
  error: string | null;
  onSubmit: (requirements: Values) => void;
}

/** Step 3: "Tell Us What You Need", one form per user type (spec §16). */
export function RequirementsStep({ userType, companyName, referenceNo, submitting, error, onSubmit }: RequirementsStepProps) {
  const form = useForm<Values>({
    resolver: zodResolver(REQUIREMENTS_SCHEMAS[userType]) as unknown as Resolver<Values>,
    defaultValues: requirementDefaults(userType, companyName),
  });

  return (
    <div>
      <h2 className="heading-2">Tell us what you need</h2>
      <p className="lead mt-3">
        {USER_TYPE_LABELS[userType]} requirements. The more you tell us, the better we can match you.
        {referenceNo && (
          <span className="mt-2 block text-sm text-charcoal-400">Your enquiry reference: {referenceNo}</span>
        )}
      </p>

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="mt-10 space-y-12">
        {REQUIREMENT_SECTIONS[userType].map((section) => (
          <fieldset key={section.title}>
            <legend className="font-serif text-xl text-navy-900">{section.title}</legend>
            <span className="gold-rule mt-3" aria-hidden />
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {section.fields.map((field) => (
                <div key={field.name} className={field.wide ? "sm:col-span-2" : undefined}>
                  <RequirementField field={field} form={form} />
                </div>
              ))}
            </div>
          </fieldset>
        ))}

        {error && (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="border-t border-charcoal-100 pt-8 sm:flex sm:justify-end">
          <button type="submit" disabled={submitting} className="btn-availability w-full sm:w-auto">
            {submitting ? "Finding opportunities…" : "Show matched opportunities"} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

function errorOf(errors: FieldErrors<Values>, name: string): string | undefined {
  const message = errors[name]?.message;
  return typeof message === "string" ? message : undefined;
}

const toNumber = (v: unknown) => (v === "" || v === null || v === undefined ? undefined : Number(v));
const toOptional = (v: unknown) => (v === "" ? undefined : v);
const toTimestamp = (v: unknown) => (typeof v === "string" && v ? Date.parse(v) : undefined);

function RequirementField({ field, form }: { field: FieldDef; form: Form }) {
  const { register, formState } = form;
  const id = `req-${field.name}`;
  const error = errorOf(formState.errors, field.name);
  const common = { label: field.label, required: !!field.required, hint: field.hint, error };

  switch (field.kind) {
    case "locations":
      return <LocationPicker form={form} {...common} />;
    case "facilities":
      return <FacilitiesPicker form={form} name={field.name} {...common} />;
    case "number":
    case "money":
      return (
        <Field {...common} htmlFor={id}>
          <div className="relative">
            {field.kind === "money" && (
              <span className="pointer-events-none absolute left-4 top-1/2 mt-1 -translate-y-1/2 text-sm text-charcoal-400">
                AED
              </span>
            )}
            <input
              id={id}
              type="number"
              inputMode="numeric"
              min={0}
              className={`${inputClass(error)} ${field.kind === "money" ? "pl-14" : ""} ${field.kind === "number" && field.unit ? "pr-24" : ""}`}
              {...register(field.name, { setValueAs: toNumber })}
            />
            {field.kind === "number" && field.unit && (
              <span className="pointer-events-none absolute right-4 top-1/2 mt-1 -translate-y-1/2 text-sm text-charcoal-400">
                {field.unit}
              </span>
            )}
          </div>
        </Field>
      );
    case "date":
      return (
        <Field {...common} htmlFor={id}>
          <input id={id} type="date" className={inputClass(error)} {...register(field.name, { setValueAs: toTimestamp })} />
        </Field>
      );
    case "select":
      return (
        <Field {...common} htmlFor={id}>
          <select id={id} className={inputClass(error)} {...register(field.name, { setValueAs: toOptional })}>
            <option value="">{field.required ? "Select…" : "No preference"}</option>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      );
    case "radio":
      return (
        <Field {...common}>
          <div role="radiogroup" aria-label={field.label} className="mt-2 flex flex-wrap gap-3">
            {field.options.map((o) => (
              <label key={o.value} className="chip-off cursor-pointer has-[:checked]:border-navy-800 has-[:checked]:bg-navy-800 has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold-400">
                <input type="radio" value={o.value} className="sr-only" {...register(field.name)} />
                {o.label}
              </label>
            ))}
          </div>
        </Field>
      );
    case "text":
      return (
        <Field {...common} htmlFor={id}>
          <input id={id} className={inputClass(error)} placeholder={field.placeholder} {...register(field.name)} />
        </Field>
      );
    case "textarea":
      return (
        <Field {...common} htmlFor={id}>
          <textarea
            id={id}
            rows={4}
            maxLength={1000}
            className={inputClass(error)}
            placeholder={field.placeholder}
            {...register(field.name)}
          />
        </Field>
      );
  }
}

interface PickerProps {
  form: Form;
  label: string;
  required: boolean;
  hint: string | undefined;
  error: string | undefined;
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** Emirates, then optional specific areas within each chosen emirate. */
function LocationPicker({ form, label, required, hint, error }: PickerProps) {
  const emirates = (form.watch("emirates") as string[] | undefined) ?? [];
  const areas = (form.watch("location_slugs") as string[] | undefined) ?? [];
  const areaError = errorOf(form.formState.errors, "emirates") ?? errorOf(form.formState.errors, "location_slugs");

  function toggleEmirate(slug: string) {
    const next = toggle(emirates, slug);
    form.setValue("emirates", next, { shouldDirty: true });
    // Dropping an emirate drops its areas too.
    form.setValue(
      "location_slugs",
      areas.filter((a) => next.some((e) => a.startsWith(`${e}-`))),
      { shouldDirty: true }
    );
  }

  return (
    <Field label={label} required={required} hint={hint} error={error ?? areaError}>
      <div className="mt-2 flex flex-wrap gap-2">
        {EMIRATES.map((e) => (
          <Chip key={e.slug} selected={emirates.includes(e.slug)} onClick={() => toggleEmirate(e.slug)}>
            {e.label}
          </Chip>
        ))}
      </div>
      {emirates.map((emirate) => (
        <div key={emirate} className="mt-4 rounded-md bg-navy-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
            Areas in {EMIRATES.find((e) => e.slug === emirate)?.label}{" "}
            <span className="font-normal normal-case tracking-normal">(optional; none selected means any area)</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {LOCATIONS.filter((l) => l.emirate === emirate).map((l) => (
              <Chip
                key={l.slug}
                selected={areas.includes(l.slug)}
                onClick={() => form.setValue("location_slugs", toggle(areas, l.slug), { shouldDirty: true })}
              >
                {l.label}
              </Chip>
            ))}
          </div>
        </div>
      ))}
    </Field>
  );
}

function FacilitiesPicker({ form, name, label, required, hint, error }: PickerProps & { name: string }) {
  const selected = (form.watch(name) as string[] | undefined) ?? [];
  return (
    <Field label={label} required={required} hint={hint} error={error}>
      <div className="mt-2 flex flex-wrap gap-2">
        {FACILITIES.map((f) => (
          <Chip
            key={f.slug}
            selected={selected.includes(f.slug)}
            onClick={() => form.setValue(name, toggle(selected, f.slug), { shouldDirty: true })}
          >
            {f.label}
          </Chip>
        ))}
      </div>
    </Field>
  );
}
