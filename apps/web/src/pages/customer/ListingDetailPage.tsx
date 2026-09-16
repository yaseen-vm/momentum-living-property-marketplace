import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { ArrowLeft, Heart, MapPin, BedDouble, Bath, Ruler, CheckCircle } from "lucide-react";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/auth";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { PageSpinner } from "../../components/ui/Spinner";
import "leaflet/dist/leaflet.css";
import type { ListingDetail } from "../../lib/api";

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [activePhoto, setActivePhoto] = useState(0);
  const [booked, setBooked] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [shortlisted, setShortlisted] = useState(false);

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => api.listings.detail(id!, token!),
    enabled: !!token && !!id,
  });

  const bookMutation = useMutation({
    mutationFn: () => api.customer.createBooking(id!, token!),
    onSuccess: () => setBooked(true),
    onError: (e) => setBookingError(e instanceof Error ? e.message : "Booking failed"),
  });

  const shortlistMutation = useMutation({
    mutationFn: () =>
      shortlisted
        ? api.customer.removeShortlist(id!, token!)
        : api.customer.addShortlist(id!, token!),
    onSuccess: () => setShortlisted((s) => !s),
  });

  if (isLoading) return <PageSpinner />;
  if (!listing) return <div className="p-8 text-center text-slate-500">Listing not found.</div>;

  const detail = listing as ListingDetail;
  const photos = detail.photos ?? [];
  const amenities = Array.isArray(detail.amenities) ? detail.amenities : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-4 sm:px-6">
          <button onClick={() => navigate("/listings")} className="text-slate-400 hover:text-slate-600">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 truncate font-semibold text-slate-900">{detail.title}</h1>
          <button
            onClick={() => shortlistMutation.mutate()}
            className={`rounded-full p-2 transition-colors ${
              shortlisted ? "text-red-500 hover:text-red-600" : "text-slate-400 hover:text-red-400"
            }`}
          >
            <Heart className={`h-5 w-5 ${shortlisted ? "fill-current" : ""}`} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Photo gallery */}
            <div className="overflow-hidden rounded-2xl bg-slate-100">
              <div className="aspect-[16/9] overflow-hidden">
                {photos.length > 0 ? (
                  <img
                    src={photos[activePhoto]?.url}
                    alt={detail.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-300 text-sm">
                    No photos
                  </div>
                )}
              </div>
              {photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto p-3">
                  {photos.map((photo, i) => (
                    <button
                      key={photo.id}
                      onClick={() => setActivePhoto(i)}
                      className={`shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                        i === activePhoto ? "border-primary-500" : "border-transparent"
                      }`}
                    >
                      <img src={photo.url} alt="" className="h-16 w-24 object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <Badge status={detail.type} />
                <span className="text-2xl font-bold text-primary-600">
                  {detail.currency} {detail.price.toLocaleString()}
                </span>
              </div>
              <h2 className="mb-2 text-xl font-bold text-slate-900">{detail.title}</h2>
              <div className="mb-4 flex items-center gap-1 text-slate-500">
                <MapPin className="h-4 w-4" />
                <span>{detail.location_text}</span>
              </div>
              <div className="mb-4 flex flex-wrap gap-4 text-sm text-slate-600">
                {detail.bedrooms != null && (
                  <span className="flex items-center gap-1">
                    <BedDouble className="h-4 w-4" />
                    {detail.bedrooms} Bedrooms
                  </span>
                )}
                {detail.bathrooms != null && (
                  <span className="flex items-center gap-1">
                    <Bath className="h-4 w-4" />
                    {detail.bathrooms} Bathrooms
                  </span>
                )}
                {detail.size_sqft != null && (
                  <span className="flex items-center gap-1">
                    <Ruler className="h-4 w-4" />
                    {detail.size_sqft} sqft
                  </span>
                )}
              </div>
              {detail.description && (
                <p className="text-sm leading-relaxed text-slate-600">{detail.description}</p>
              )}
            </div>

            {/* Amenities */}
            {amenities.length > 0 && (
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h3 className="mb-3 font-semibold text-slate-900">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {amenities.map((a) => (
                    <span
                      key={a}
                      className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
                    >
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Map */}
            {detail.latitude != null && detail.longitude != null && (
              <div className="overflow-hidden rounded-2xl shadow-sm">
                <MapContainer
                  center={[detail.latitude, detail.longitude]}
                  zoom={15}
                  style={{ height: 300 }}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  <Marker position={[detail.latitude, detail.longitude]}>
                    <Popup>{detail.title}</Popup>
                  </Marker>
                </MapContainer>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-4 text-center">
                <div className="text-3xl font-bold text-primary-600">
                  {detail.currency} {detail.price.toLocaleString()}
                </div>
                <div className="mt-1 text-sm text-slate-500">per annum</div>
              </div>

              <div className="mb-3 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <p className="font-medium text-slate-900">Listed by</p>
                <p>{detail.vendor_name}</p>
              </div>

              {booked ? (
                <div className="rounded-lg bg-green-50 px-4 py-3 text-center text-sm text-green-800">
                  <CheckCircle className="mx-auto mb-1 h-5 w-5 text-green-600" />
                  Booking request sent! Admin will contact you shortly.
                </div>
              ) : (
                <>
                  <Button
                    className="w-full"
                    loading={bookMutation.isPending}
                    onClick={() => bookMutation.mutate()}
                  >
                    Request to Book
                  </Button>
                  {bookingError && (
                    <p className="mt-2 text-center text-xs text-red-600">{bookingError}</p>
                  )}
                  <p className="mt-3 text-center text-xs text-slate-400">
                    Our admin will contact you within 24 hours
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
