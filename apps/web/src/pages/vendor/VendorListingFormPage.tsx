import { useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Upload, X, ArrowLeft } from "lucide-react";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/auth";
import { Button } from "../../components/ui/Button";
import { Input, Textarea, Select } from "../../components/ui/Input";
import { PageSpinner } from "../../components/ui/Spinner";

const LISTING_TYPES = [
  { value: "labour_camp", label: "Labour Camp" },
  { value: "warehouse", label: "Warehouse" },
  { value: "land", label: "Land / Plot" },
];

const AMENITIES_LABOUR_CAMP = [
  "AC", "Wifi", "CCTV", "Canteen", "Laundry", "Gym", "Prayer Room",
  "Parking", "24/7 Security", "Separate Toilets", "First Aid",
];

const AMENITIES_WAREHOUSE = [
  "Electricity (3-phase)", "Water Supply", "CCTV", "Fire Suppression",
  "Parking", "24/7 Security", "Office Space", "Mezzanine Floor",
  "Roller Shutter", "Racking System",
];

const AMENITIES_LAND = [
  "Road Access", "Electricity Connection", "Water Connection",
  "Sewage Connection", "Boundary Wall", "Corner Plot",
];

const AMENITIES_BY_TYPE: Record<string, string[]> = {
  labour_camp: AMENITIES_LABOUR_CAMP,
  warehouse: AMENITIES_WAREHOUSE,
  land: AMENITIES_LAND,
};

const listingSchema = z.object({
  type: z.enum(["labour_camp", "warehouse", "land"]),
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  price: z.coerce.number().positive("Price must be positive"),
  currency: z.string().min(3),
  location_text: z.string().min(3, "Location required"),
  location_slug: z.string().min(3),
  size_sqft: z.coerce.number().positive().optional().or(z.literal("")),
  // Labour camp
  num_rooms: z.coerce.number().int().positive().optional().or(z.literal("")),
  persons_per_room: z.coerce.number().int().positive().optional().or(z.literal("")),
  room_size_sqft: z.coerce.number().positive().optional().or(z.literal("")),
  total_capacity: z.coerce.number().int().positive().optional().or(z.literal("")),
  mohre_certified: z.boolean().default(false),
  ejari_registered: z.boolean().default(false),
  // Warehouse
  num_loading_bays: z.coerce.number().int().nonnegative().optional().or(z.literal("")),
  year_built: z.coerce.number().int().optional().or(z.literal("")),
  // Land
  freehold: z.boolean().default(false),
  // Financial
  security_deposit_pct: z.coerce.number().min(0).max(100).optional().or(z.literal("")),
  commission_pct: z.coerce.number().min(0).max(100).optional().or(z.literal("")),
  ejari_fee: z.coerce.number().nonnegative().optional().or(z.literal("")),
  admin_fee: z.coerce.number().nonnegative().optional().or(z.literal("")),
  amenities: z.array(z.string()).default([]),
});

type ListingFormValues = z.infer<typeof listingSchema>;

interface PhotoPreview {
  url: string;
  key: string;
  uploading?: boolean;
}

function numericOrUndefined(v: number | "" | undefined) {
  return v === "" || v === undefined ? undefined : Number(v);
}

export default function VendorListingFormPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const isEditing = !!id;

  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const { data: existing, isLoading } = useQuery({
    queryKey: ["vendor-listing", id],
    queryFn: () => api.vendor.getListing(id!, token!),
    enabled: isEditing && !!token,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ListingFormValues>({
    resolver: zodResolver(listingSchema),
    defaultValues: existing
      ? {
          type: existing.type as "labour_camp" | "warehouse" | "land",
          title: existing.title,
          description: "",
          price: existing.price,
          currency: existing.currency,
          location_text: existing.location_text,
          location_slug: "",
          amenities: [],
          mohre_certified: false,
          ejari_registered: false,
          freehold: false,
        }
      : { currency: "AED", amenities: [], mohre_certified: false, ejari_registered: false, freehold: false },
  });

  const listingType = watch("type");
  const selectedAmenities = watch("amenities");
  const amenityList = AMENITIES_BY_TYPE[listingType] ?? [];

  function toSlug(text: string) {
    return text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }

  const uploadPhoto = useCallback(
    async (file: File) => {
      if (!token) return;
      if (photos.length >= 20) {
        setPhotoError("Maximum 20 photos allowed");
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      const placeholder: PhotoPreview = { url: previewUrl, key: "", uploading: true };
      setPhotos((p) => [...p, placeholder]);
      try {
        const { key } = await api.upload.uploadFile(file, "listing_photo", token);
        setPhotos((p) =>
          p.map((ph) => (ph.url === previewUrl ? { url: previewUrl, key, uploading: false } : ph))
        );
      } catch (e) {
        setPhotos((p) => p.filter((ph) => ph.url !== previewUrl));
        setPhotoError(`Upload failed: ${e instanceof Error ? e.message : "unknown error"}`);
      }
    },
    [token, photos.length]
  );

  async function onSubmit(data: ListingFormValues, submitForReview: boolean) {
    if (!token) return;
    setSubmitting(true);
    setGeneralError(null);
    try {
      const body = {
        ...data,
        size_sqft: numericOrUndefined(data.size_sqft),
        num_rooms: numericOrUndefined(data.num_rooms),
        persons_per_room: numericOrUndefined(data.persons_per_room),
        room_size_sqft: numericOrUndefined(data.room_size_sqft),
        total_capacity: numericOrUndefined(data.total_capacity),
        num_loading_bays: numericOrUndefined(data.num_loading_bays),
        year_built: numericOrUndefined(data.year_built),
        security_deposit_pct: numericOrUndefined(data.security_deposit_pct),
        commission_pct: numericOrUndefined(data.commission_pct),
        ejari_fee: numericOrUndefined(data.ejari_fee),
        admin_fee: numericOrUndefined(data.admin_fee),
        photo_r2_keys: photos.filter((p) => p.key).map((p, i) => ({ r2_key: p.key, display_order: i })),
      };
      if (isEditing) {
        await api.vendor.updateListing(id, body, token);
        if (submitForReview) await api.vendor.submitListing(id, token);
      } else {
        const { listingId } = await api.vendor.createListing(body, token);
        if (submitForReview) await api.vendor.submitListing(listingId, token);
      }
      navigate("/vendor/dashboard");
    } catch (e) {
      setGeneralError(e instanceof Error ? e.message : "Failed to save listing");
    } finally {
      setSubmitting(false);
    }
  }

  if (isEditing && isLoading) return <PageSpinner />;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-4 sm:px-6">
          <button onClick={() => navigate("/vendor/dashboard")} className="text-slate-400 hover:text-slate-600">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-slate-900">
            {isEditing ? "Edit Listing" : "New Listing"}
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <form className="space-y-6">

          {/* ── Basic Info ── */}
          <div className="rounded-xl bg-white p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-slate-900">Basic Information</h2>
            <Select
              label="Property Type"
              options={LISTING_TYPES}
              {...register("type")}
              error={errors.type?.message}
            />
            <Input label="Listing Title" placeholder="e.g. Labour Camp — 500 Beds, Sonapur" {...register("title")} error={errors.title?.message} />
            <Textarea
              label="Description"
              placeholder="Describe the property in detail…"
              rows={4}
              {...register("description")}
              error={errors.description?.message}
            />
          </div>

          {/* ── Pricing & Location ── */}
          <div className="rounded-xl bg-white p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-slate-900">Pricing & Location</h2>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Price (AED)" type="number" {...register("price")} error={errors.price?.message} />
              <Select
                label="Currency"
                options={[{ value: "AED", label: "AED" }, { value: "USD", label: "USD" }]}
                {...register("currency")}
              />
            </div>
            <Input
              label="Location"
              placeholder="e.g. Al Quoz Industrial Area, Dubai"
              {...register("location_text", {
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                  setValue("location_slug", toSlug(e.target.value));
                },
              })}
              error={errors.location_text?.message}
            />
            <Input
              label="Location Slug (auto-generated)"
              {...register("location_slug")}
              hint="Used for URL-friendly filtering"
              error={errors.location_slug?.message}
            />
            <Input label="Total Area (sqft)" type="number" {...register("size_sqft")} hint="Total land / building area" />
          </div>

          {/* ── Labour Camp Details ── */}
          {listingType === "labour_camp" && (
            <div className="rounded-xl bg-white p-6 shadow-sm space-y-4">
              <h2 className="font-semibold text-slate-900">Labour Camp Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Number of Rooms" type="number" {...register("num_rooms")} error={errors.num_rooms?.message} />
                <Input label="Persons per Room" type="number" {...register("persons_per_room")} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Room Size (sqft)" type="number" {...register("room_size_sqft")} />
                <Input label="Total Capacity (persons)" type="number" {...register("total_capacity")} />
              </div>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register("mohre_certified")} className="h-4 w-4 rounded border-slate-300 text-primary-600" />
                  <span className="text-sm font-medium text-slate-700">Mohre Certified</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register("ejari_registered")} className="h-4 w-4 rounded border-slate-300 text-primary-600" />
                  <span className="text-sm font-medium text-slate-700">Ejari Registered</span>
                </label>
              </div>
            </div>
          )}

          {/* ── Warehouse Details ── */}
          {listingType === "warehouse" && (
            <div className="rounded-xl bg-white p-6 shadow-sm space-y-4">
              <h2 className="font-semibold text-slate-900">Warehouse Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Number of Loading Bays" type="number" {...register("num_loading_bays")} />
                <Input label="Year Built" type="number" placeholder="e.g. 2018" {...register("year_built")} />
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register("ejari_registered")} className="h-4 w-4 rounded border-slate-300 text-primary-600" />
                  <span className="text-sm font-medium text-slate-700">Ejari Registered</span>
                </label>
              </div>
            </div>
          )}

          {/* ── Land Details ── */}
          {listingType === "land" && (
            <div className="rounded-xl bg-white p-6 shadow-sm space-y-4">
              <h2 className="font-semibold text-slate-900">Land Details</h2>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register("freehold")} className="h-4 w-4 rounded border-slate-300 text-primary-600" />
                  <span className="text-sm font-medium text-slate-700">Freehold (unchecked = Leasehold)</span>
                </label>
              </div>
            </div>
          )}

          {/* ── Financial Terms ── */}
          <div className="rounded-xl bg-white p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-slate-900">Financial Terms</h2>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Security Deposit (%)" type="number" step="0.5" {...register("security_deposit_pct")} hint="e.g. 5 for 5%" />
              <Input label="Agency Commission (%)" type="number" step="0.5" {...register("commission_pct")} hint="Commission to Momentum Living" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Ejari Fee (AED)" type="number" {...register("ejari_fee")} />
              <Input label="Admin Fee (AED)" type="number" {...register("admin_fee")} />
            </div>
          </div>

          {/* ── Amenities ── */}
          {amenityList.length > 0 && (
            <div className="rounded-xl bg-white p-6 shadow-sm space-y-4">
              <h2 className="font-semibold text-slate-900">Amenities & Features</h2>
              <div className="flex flex-wrap gap-2">
                {amenityList.map((amenity) => {
                  const selected = selectedAmenities.includes(amenity);
                  return (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() => {
                        const updated = selected
                          ? selectedAmenities.filter((a) => a !== amenity)
                          : [...selectedAmenities, amenity];
                        setValue("amenities", updated);
                      }}
                      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                        selected
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {amenity}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Photos ── */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-slate-900">Photos (up to 20)</h2>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {photos.map((photo, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                  <img src={photo.url} alt="" className="h-full w-full object-cover" />
                  {photo.uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </div>
                  )}
                  {!photo.uploading && (
                    <button
                      type="button"
                      onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                      className="absolute right-1 top-1 rounded-full bg-black/50 p-0.5 text-white hover:bg-black/70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              {photos.length < 20 && (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 hover:border-primary-400 hover:bg-primary-50">
                  <Upload className="mb-1 h-6 w-6 text-slate-400" />
                  <span className="text-xs text-slate-400">Add Photo</span>
                  <input
                    type="file"
                    className="sr-only"
                    accept=".jpg,.jpeg,.png,.webp"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      files.forEach((f) => void uploadPhoto(f));
                    }}
                  />
                </label>
              )}
            </div>
            {photoError && <p className="mt-2 text-xs text-red-600">{photoError}</p>}
          </div>

          {generalError && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{generalError}</div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              loading={submitting}
              onClick={handleSubmit((data) => onSubmit(data, false))}
            >
              Save as Draft
            </Button>
            <Button
              type="button"
              className="flex-1"
              loading={submitting}
              onClick={handleSubmit((data) => onSubmit(data, true))}
            >
              Submit for Review
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
