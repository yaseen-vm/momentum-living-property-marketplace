import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  CONTACT_KINDS_BY_USER_TYPE,
  OWNERSHIP_STATUSES,
  OWNERSHIP_STATUS_LABELS,
  USER_TYPE_LABELS,
  companyDetailsSchema,
  individualDetailsSchema,
  landlordDetailsSchema,
  mobileSchema,
} from "@momentum/shared";
import type { ContactKind, EnquiryDetails, UserType } from "@momentum/shared";
import { useContent } from "../../lib/content";
import { BRAND } from "../../lib/site";
import { Field, inputClass } from "./Field";

const SCHEMAS = {
  individual: individualDetailsSchema.extend({ mobile: mobileSchema }),
  company: companyDetailsSchema.extend({ mobile: mobileSchema }),
  landlord: landlordDetailsSchema.extend({ mobile: mobileSchema }),
};

/** Superset of the three Step 2 forms; each schema validates its own subset. */
interface DetailsFormValues {
  user_type: UserType;
  contact_kind: ContactKind;
  full_name?: string;
  company_name?: string;
  position?: string;
  email?: string;
  mobile?: string;
  nationality?: string;
  company_website?: string;
  business_type?: string;
  ownership_status?: string;
  consent?: boolean;
}

interface DetailsStepProps {
  userType: UserType;
  initial: EnquiryDetails | null;
  initialMobile: string | null;
  onBack: () => void;
  onSubmit: (details: EnquiryDetails, mobile: string) => void;
}

/** Step 2: individual / company / landlord details, mobile for OTP, and consent (spec §14, §22). */
export function DetailsStep({ userType, initial, initialMobile, onBack, onSubmit }: DetailsStepProps) {
  const kinds: readonly ContactKind[] = CONTACT_KINDS_BY_USER_TYPE[userType];
  const [kind, setKind] = useState<ContactKind>(
    initial && kinds.includes(initial.contact_kind) ? initial.contact_kind : kinds[0]!
  );

  return (
    <div>
      <h2 className="heading-2">Your details</h2>
      <p className="lead mt-3">
        {USER_TYPE_LABELS[userType]} enquiry. We use these details only to respond to your enquiry.
      </p>

      {kinds.length > 1 && (
        <div className="mt-8 inline-flex rounded-md border border-charcoal-200 p-1" role="group" aria-label="Enquiring as">
          {kinds.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={
                kind === k
                  ? "rounded bg-navy-800 px-5 py-2.5 text-sm font-semibold text-white"
                  : "rounded px-5 py-2.5 text-sm font-semibold text-charcoal-500 hover:text-navy-800"
              }
            >
              {k === "individual" ? "Individual" : "Company"}
            </button>
          ))}
        </div>
      )}

      {/* Remount per kind so each form starts with its own schema and defaults. */}
      <DetailsForm
        key={kind}
        userType={userType}
        kind={kind}
        initial={initial?.contact_kind === kind ? initial : null}
        initialMobile={initialMobile}
        onBack={onBack}
        onSubmit={onSubmit}
      />
    </div>
  );
}

interface DetailsFormProps extends Omit<DetailsStepProps, "initial"> {
  kind: ContactKind;
  initial: EnquiryDetails | null;
}

function DetailsForm({ userType, kind, initial, initialMobile, onBack, onSubmit }: DetailsFormProps) {
  const { data: config } = useContent("availability_config");
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DetailsFormValues>({
    resolver: zodResolver(SCHEMAS[kind]) as unknown as Resolver<DetailsFormValues>,
    defaultValues: {
      ...(initial as Partial<DetailsFormValues> | null),
      user_type: userType,
      contact_kind: kind,
      mobile: initialMobile ?? "+971",
      consent: false,
    },
  });

  function submit(values: DetailsFormValues) {
    const { mobile, ...details } = values;
    if (kind === "individual" && config.nationality_field === "required" && !details.nationality) {
      setError("nationality", { message: "Nationality is required" });
      return;
    }
    if (kind === "individual" && config.nationality_field === "hidden") delete details.nationality;
    onSubmit(details as EnquiryDetails, mobile!);
  }

  const text = (name: keyof DetailsFormValues, label: string, required: boolean, props?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <Field label={label} htmlFor={`details-${name}`} required={required} error={errors[name]?.message}>
      <input id={`details-${name}`} className={inputClass(errors[name])} {...props} {...register(name)} />
    </Field>
  );

  const nameLabel = kind === "company" ? "Contact person" : kind === "landlord" ? "Full name / contact person" : "Full name";

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="mt-8 space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        {kind === "company" && text("company_name", "Company name", true, { autoComplete: "organization" })}
        {text("full_name", nameLabel, true, { autoComplete: "name" })}
        {kind === "company" && text("position", "Position", true, { autoComplete: "organization-title" })}
        {kind === "landlord" && text("company_name", "Company", false, { autoComplete: "organization" })}

        <Field
          label="Mobile number"
          htmlFor="details-mobile"
          required
          hint="With country code. We will send a one-time code to verify it."
          error={errors.mobile?.message}
        >
          <input
            id="details-mobile"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className={inputClass(errors.mobile)}
            {...register("mobile")}
          />
        </Field>
        {text("email", "Email", true, { type: "email", autoComplete: "email", inputMode: "email" })}

        {kind === "individual" && (
          <>
            {config.nationality_field !== "hidden" &&
              text("nationality", "Nationality", config.nationality_field === "required")}
            {text("company_name", "Company name", false, { autoComplete: "organization" })}
            {text("position", "Position / job title", false, { autoComplete: "organization-title" })}
          </>
        )}

        {kind === "company" && (
          <>
            {text("business_type", "Business type", true, { placeholder: "e.g. Construction, Facilities management" })}
            {text("company_website", "Company website", false, { type: "url", placeholder: "https://" })}
          </>
        )}

        {kind === "landlord" && (
          <Field
            label="Ownership / representation"
            htmlFor="details-ownership_status"
            required
            error={errors.ownership_status?.message}
          >
            <select
              id="details-ownership_status"
              className={inputClass(errors.ownership_status)}
              {...register("ownership_status")}
            >
              <option value="">Select…</option>
              {OWNERSHIP_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {OWNERSHIP_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>

      <div>
        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-charcoal-100 bg-navy-50/50 p-4">
          <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-navy-800" {...register("consent")} />
          <span className="text-sm leading-relaxed text-charcoal-600">
            I agree to {BRAND.name} contacting me about my enquiry by phone, WhatsApp or email, and I have read the{" "}
            <Link to="/privacy" target="_blank" className="font-medium text-navy-800 underline underline-offset-2">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {errors.consent && (
          <p role="alert" className="field-error">
            {errors.consent.message}
          </p>
        )}
      </div>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
        <button type="button" onClick={onBack} className="btn-secondary">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          Continue <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
