import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Upload, CheckCircle } from "lucide-react";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/auth";
import { Button } from "../../components/ui/Button";
import { Input, Select } from "../../components/ui/Input";

type VendorType = "landlord" | "company" | "agent" | "broker";

const DOCUMENTS: Record<VendorType, string[]> = {
  landlord: ["Ownership Proof", "National ID"],
  company: ["Trade Licence", "Authorised Signatory ID"],
  agent: ["Agency Licence", "Personal ID"],
  broker: ["Brokerage Certificate", "Personal ID"],
};

const detailsSchema = z.object({
  name: z.string().min(2, "Full name required"),
  company_name: z.string().optional(),
  licence_no: z.string().optional(),
});

type DetailsForm = z.infer<typeof detailsSchema>;

export default function VendorRegisterPage() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [vendorType, setVendorType] = useState<VendorType | null>(null);
  const [details, setDetails] = useState<DetailsForm | null>(null);
  const [uploads, setUploads] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DetailsForm>({ resolver: zodResolver(detailsSchema) });

  async function uploadDoc(label: string, file: File) {
    if (!token) return;
    setUploading((u) => ({ ...u, [label]: true }));
    try {
      const { key, uploadUrl } = await api.upload.presign(file.name, file.type, "vendor-doc", token);
      await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      setUploads((u) => ({ ...u, [label]: key }));
    } catch (e) {
      setError(`Upload failed for ${label}: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setUploading((u) => ({ ...u, [label]: false }));
    }
  }

  async function handleSubmitRegistration() {
    if (!token || !vendorType || !details) return;
    const docs = vendorType ? DOCUMENTS[vendorType] : [];
    const missingDocs = docs.filter((label) => !uploads[label]);
    if (missingDocs.length > 0) {
      setError(`Please upload all required documents: ${missingDocs.join(", ")}`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.vendor.register(
        {
          vendor_type: vendorType,
          company_name: details.company_name ?? undefined,
          licence_no: details.licence_no ?? undefined,
          document_r2_keys: Object.entries(uploads).map(([label, r2_key]) => ({ label, r2_key })),
        },
        token
      );
      navigate("/vendor/pending");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  const vendorTypeOptions = [
    { value: "landlord", label: "Landlord — Individual property owner" },
    { value: "company", label: "Company — Real estate company" },
    { value: "agent", label: "Agent — Licensed real estate agent" },
    { value: "broker", label: "Broker — Certified property broker" },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-primary-50 px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex justify-center gap-2 items-center">
          <Building2 className="h-8 w-8 text-primary-600" />
          <span className="text-xl font-bold text-slate-900">Momentum Living</span>
        </div>

        {/* Progress */}
        <div className="mb-8 flex items-center justify-center gap-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  s < step
                    ? "bg-green-500 text-white"
                    : s === step
                    ? "bg-primary-600 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {s < step ? <CheckCircle className="h-5 w-5" /> : s}
              </div>
              {s < 3 && <div className={`h-0.5 w-12 ${s < step ? "bg-green-400" : "bg-slate-200"}`} />}
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl">
          {step === 1 && (
            <div>
              <h2 className="mb-1 text-xl font-bold text-slate-900">Select Vendor Type</h2>
              <p className="mb-6 text-sm text-slate-500">
                Choose the category that best describes you
              </p>
              <div className="grid gap-3">
                {vendorTypeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setVendorType(opt.value as VendorType)}
                    className={`rounded-xl border-2 p-4 text-left transition-all ${
                      vendorType === opt.value
                        ? "border-primary-500 bg-primary-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span className="font-medium text-slate-900">{opt.label.split(" — ")[0]}</span>
                    <span className="ml-2 text-sm text-slate-500">{opt.label.split(" — ")[1]}</span>
                  </button>
                ))}
              </div>
              <Button
                className="mt-6 w-full"
                disabled={!vendorType}
                onClick={() => setStep(2)}
              >
                Continue
              </Button>
            </div>
          )}

          {step === 2 && (
            <form
              onSubmit={handleSubmit((data) => {
                setDetails(data);
                setStep(3);
              })}
            >
              <h2 className="mb-1 text-xl font-bold text-slate-900">Your Details</h2>
              <p className="mb-6 text-sm text-slate-500">Tell us about yourself</p>
              <div className="space-y-4">
                <Input label="Full Name" {...register("name")} error={errors.name?.message} />
                {(vendorType === "company" || vendorType === "agent" || vendorType === "broker") && (
                  <Input
                    label="Company / Agency Name"
                    {...register("company_name")}
                    error={errors.company_name?.message}
                  />
                )}
                {(vendorType === "company" || vendorType === "agent" || vendorType === "broker") && (
                  <Input
                    label="Licence / Registration Number"
                    {...register("licence_no")}
                    error={errors.licence_no?.message}
                  />
                )}
              </div>
              <div className="mt-6 flex gap-3">
                <Button variant="secondary" type="button" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="submit" className="flex-1">
                  Continue
                </Button>
              </div>
            </form>
          )}

          {step === 3 && vendorType && (
            <div>
              <h2 className="mb-1 text-xl font-bold text-slate-900">Upload Documents</h2>
              <p className="mb-6 text-sm text-slate-500">
                Required documents for {vendorType} verification
              </p>
              <div className="space-y-4">
                {DOCUMENTS[vendorType].map((label) => (
                  <div key={label}>
                    <p className="mb-2 text-sm font-medium text-slate-700">{label}</p>
                    {uploads[label] ? (
                      <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">
                        <CheckCircle className="h-4 w-4" />
                        Uploaded successfully
                      </div>
                    ) : (
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-slate-300 px-4 py-4 hover:border-primary-400 hover:bg-primary-50">
                        <Upload className="h-5 w-5 text-slate-400" />
                        <span className="text-sm text-slate-500">
                          {uploading[label] ? "Uploading…" : "Click to upload (PDF, JPG, PNG — max 5MB)"}
                        </span>
                        <input
                          type="file"
                          className="sr-only"
                          accept=".pdf,.jpg,.jpeg,.png"
                          disabled={uploading[label]}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void uploadDoc(label, file);
                          }}
                        />
                      </label>
                    )}
                  </div>
                ))}
              </div>
              {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
              <div className="mt-6 flex gap-3">
                <Button variant="secondary" type="button" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  loading={submitting}
                  onClick={() => void handleSubmitRegistration()}
                >
                  Submit for Review
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
