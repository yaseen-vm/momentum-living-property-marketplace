import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, CheckCircle } from "lucide-react";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/auth";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

type VendorType =
  | "labour_camp_landlord"
  | "labour_camp_management"
  | "warehouse_landlord"
  | "warehouse_management"
  | "land_seller";

const VENDOR_TYPE_OPTIONS: { value: VendorType; label: string; description: string }[] = [
  { value: "labour_camp_landlord", label: "Labour Camp Landlord", description: "Owner of a labour camp accommodation" },
  { value: "labour_camp_management", label: "Labour Camp Management", description: "Managing company operating on behalf of a landlord" },
  { value: "warehouse_landlord", label: "Warehouse Landlord", description: "Owner of a warehouse or industrial unit" },
  { value: "warehouse_management", label: "Warehouse Management", description: "Managing company for warehouse properties" },
  { value: "land_seller", label: "Land Seller", description: "Owner selling freehold or leasehold land" },
];

const DOCUMENTS: Record<VendorType, string[]> = {
  labour_camp_landlord: ["Trade Licence", "Title Deed / Ownership Proof"],
  labour_camp_management: ["Trade Licence", "Management Agreement", "Authorised Signatory ID"],
  warehouse_landlord: ["Trade Licence", "Title Deed / Ownership Proof"],
  warehouse_management: ["Trade Licence", "Management Agreement", "Authorised Signatory ID"],
  land_seller: ["Trade Licence", "Title Deed / Ownership Proof", "NOC (if applicable)"],
};

const detailsSchema = z.object({
  company_name: z.string().min(2, "Company name required"),
  authorized_signatory: z.string().min(2, "Authorised signatory name required"),
  trade_licence_no: z.string().min(2, "Trade licence number required"),
  vat_no: z.string().optional(),
  whatsapp_no: z.string().optional(),
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
      const { key } = await api.upload.uploadFile(file, "vendor_doc", token);
      setUploads((u) => ({ ...u, [label]: key }));
    } catch (e) {
      setError(`Upload failed for ${label}: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setUploading((u) => ({ ...u, [label]: false }));
    }
  }

  async function handleSubmitRegistration() {
    if (!token || !vendorType || !details) return;
    const docs = DOCUMENTS[vendorType];
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
          company_name: details.company_name,
          trade_licence_no: details.trade_licence_no,
          vat_no: details.vat_no || undefined,
          authorized_signatory: details.authorized_signatory,
          whatsapp_no: details.whatsapp_no || undefined,
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <div className="text-2xl font-bold italic font-serif text-[#1D3B53]">
            Momentum<span className="font-sans font-semibold not-italic">Living</span>
          </div>
          <p className="text-sm text-slate-500 mt-1">Owner Registration</p>
        </div>

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
              <h2 className="mb-1 text-xl font-bold text-slate-900">Select Owner Type</h2>
              <p className="mb-6 text-sm text-slate-500">Choose the category that best describes your business</p>
              <div className="grid gap-3">
                {VENDOR_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setVendorType(opt.value)}
                    className={`rounded-xl border-2 p-4 text-left transition-all ${
                      vendorType === opt.value
                        ? "border-primary-500 bg-primary-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <p className="font-medium text-slate-900">{opt.label}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{opt.description}</p>
                  </button>
                ))}
              </div>
              <Button className="mt-6 w-full" disabled={!vendorType} onClick={() => setStep(2)}>
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
              <h2 className="mb-1 text-xl font-bold text-slate-900">Company Details</h2>
              <p className="mb-6 text-sm text-slate-500">Enter your business information</p>
              <div className="space-y-4">
                <Input
                  label="Company / Business Name"
                  placeholder="e.g. Al Noor Properties LLC"
                  {...register("company_name")}
                  error={errors.company_name?.message}
                />
                <Input
                  label="Authorised Signatory Name"
                  placeholder="Full name of the authorised person"
                  {...register("authorized_signatory")}
                  error={errors.authorized_signatory?.message}
                />
                <Input
                  label="Trade Licence Number"
                  placeholder="e.g. 1234567"
                  {...register("trade_licence_no")}
                  error={errors.trade_licence_no?.message}
                />
                <Input
                  label="VAT Registration Number (optional)"
                  placeholder="e.g. 100123456789003"
                  {...register("vat_no")}
                  error={errors.vat_no?.message}
                />
                <Input
                  label="WhatsApp Number (optional)"
                  placeholder="e.g. +971501234567"
                  {...register("whatsapp_no")}
                  error={errors.whatsapp_no?.message}
                />
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
                Required documents for verification (PDF, JPG, PNG — max 5 MB each)
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
                          {uploading[label] ? "Uploading…" : "Click to upload"}
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
                <Button className="flex-1" loading={submitting} onClick={() => void handleSubmitRegistration()}>
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
