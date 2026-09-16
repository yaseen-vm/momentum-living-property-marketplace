import { useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Upload, X, ArrowLeft } from "lucide-react";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/auth";
import { Button } from "../../components/ui/Button";
import { Input, Textarea, Select } from "../../components/ui/Input";
import { PageSpinner } from "../../components/ui/Spinner";

const AMENITIES = [
  "Parking", "Swimming Pool", "Gym", "Security", "Balcony", "Garden",
  "AC", "Furnished", "Internet", "Elevator", "Pet Friendly", "Laundry",
];

const listingSchema = z.object({
  type: z.enum(["property", "plot", "room"]),
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  price: z.coerce.number().positive("Price must be positive"),
  currency: z.string().min(3),
  location_text: z.string().min(3, "Location required"),
  location_slug: z.string().min(3),
  size_sqft: z.coerce.number().positive().optional().or(z.literal("")),
  bedrooms: z.coerce.number().int().nonnegative().optional().or(z.literal("")),
  bathrooms: z.coerce.number().int().nonnegative().optional().or(z.literal("")),
  amenities: z.array(z.string()).default([]),
});

type ListingFormValues = z.infer<typeof listingSchema>;

interface PhotoPreview {
  url: string;
  key: string;
  uploading?: boolean;
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
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ListingFormValues>({
    resolver: zodResolver(listingSchema),
    defaultValues: existing
      ? {
          type: existing.type as "property" | "plot" | "room",
          title: existing.title,
          description: "",
          price: existing.price,
          currency: existing.currency,
          location_text: existing.location_text,
          location_slug: "",
          amenities: [],
        }
      : { currency: "AED", amenities: [] },
  });

  const locationText = watch("location_text");

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
        size_sqft: data.size_sqft || undefined,
        bedrooms: data.bedrooms || undefined,
        bathrooms: data.bathrooms || undefined,
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

  const selectedAmenities = watch("amenities");

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
          <div className="rounded-xl bg-white p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-slate-900">Basic Info</h2>
            <Select
              label="Listing Type"
              options={[
                { value: "property", label: "Property" },
                { value: "plot", label: "Plot" },
                { value: "room", label: "Room" },
              ]}
              {...register("type")}
              error={errors.type?.message}
            />
            <Input label="Title" placeholder="e.g. Spacious 3BHK Villa in Dubai Marina" {...register("title")} error={errors.title?.message} />
            <Textarea
              label="Description"
              placeholder="Describe the property in detail…"
              rows={4}
              {...register("description")}
              error={errors.description?.message}
            />
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-slate-900">Pricing & Location</h2>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Price" type="number" {...register("price")} error={errors.price?.message} />
              <Select
                label="Currency"
                options={[
                  { value: "AED", label: "AED" },
                  { value: "INR", label: "INR" },
                  { value: "USD", label: "USD" },
                ]}
                {...register("currency")}
              />
            </div>
            <Input
              label="Location"
              placeholder="e.g. Dubai Marina, Dubai"
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
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-slate-900">Property Details</h2>
            <div className="grid grid-cols-3 gap-4">
              <Input label="Size (sqft)" type="number" {...register("size_sqft")} />
              <Input label="Bedrooms" type="number" {...register("bedrooms")} />
              <Input label="Bathrooms" type="number" {...register("bathrooms")} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Amenities</p>
              <div className="flex flex-wrap gap-2">
                {AMENITIES.map((amenity) => {
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
          </div>

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
