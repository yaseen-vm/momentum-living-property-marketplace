import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, MapPin, Home, LogOut } from "lucide-react";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/auth";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { PageSpinner } from "../../components/ui/Spinner";
import type { ListingSummary } from "../../lib/api";

const LISTING_TYPES = [
  { value: "", label: "All Types" },
  { value: "property", label: "Property" },
  { value: "plot", label: "Plot" },
  { value: "room", label: "Room" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

export default function ListingBrowsePage() {
  const navigate = useNavigate();
  const { token, clearAuth } = useAuthStore();

  const [filters, setFilters] = useState({
    type: "",
    location: "",
    minPrice: "",
    maxPrice: "",
    sortBy: "newest",
    page: "1",
    limit: "20",
  });
  const [showFilters, setShowFilters] = useState(false);

  const queryParams = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== "")
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["listings", filters],
    queryFn: () => api.listings.browse(queryParams, token!),
    enabled: !!token,
  });

  function updateFilter(key: string, value: string) {
    setFilters((f) => ({ ...f, [key]: value, page: "1" }));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold italic font-serif text-[#1D3B53]">Momentum<span className="font-sans font-semibold not-italic">Living</span></span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </Button>
            <Button variant="ghost" size="sm" onClick={clearAuth}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {/* Search bar */}
        <div className="border-t border-slate-100 px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by location…"
                value={filters.location}
                onChange={(e) => updateFilter("location", e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
              />
            </div>
            <select
              value={filters.type}
              onChange={(e) => updateFilter("type", e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
            >
              {LISTING_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <select
              value={filters.sortBy}
              onChange={(e) => updateFilter("sortBy", e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
        {showFilters && (
          <div className="border-t border-slate-100 px-4 py-3 sm:px-6">
            <div className="mx-auto flex max-w-3xl flex-wrap gap-3">
              <Input
                placeholder="Min price"
                type="number"
                value={filters.minPrice}
                onChange={(e) => updateFilter("minPrice", e.target.value)}
                className="w-32"
              />
              <Input
                placeholder="Max price"
                type="number"
                value={filters.maxPrice}
                onChange={(e) => updateFilter("maxPrice", e.target.value)}
                className="w-32"
              />
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {isLoading ? (
          <PageSpinner />
        ) : error ? (
          <div className="py-16 text-center text-red-600">
            {error instanceof Error ? error.message : "Failed to load listings"}
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {data?.total ?? 0} listing{data?.total !== 1 ? "s" : ""} found
              </p>
            </div>
            {(!data?.listings || data.listings.length === 0) ? (
              <div className="py-24 text-center">
                <Home className="mx-auto mb-3 h-12 w-12 text-slate-200" />
                <p className="text-slate-500">No listings match your filters.</p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {data.listings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    onClick={() => navigate(`/listings/${listing.id}`)}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {data && data.total > Number(filters.limit) && (
              <div className="mt-8 flex justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={Number(filters.page) <= 1}
                  onClick={() => updateFilter("page", String(Number(filters.page) - 1))}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 text-sm text-slate-600">
                  Page {filters.page} of {Math.ceil(data.total / Number(filters.limit))}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={Number(filters.page) >= Math.ceil(data.total / Number(filters.limit))}
                  onClick={() => updateFilter("page", String(Number(filters.page) + 1))}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function ListingCard({ listing, onClick }: { listing: ListingSummary; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md text-left w-full"
    >
      <div className="aspect-[4/3] overflow-hidden bg-slate-100">
        {listing.thumbnail ? (
          <img
            src={listing.thumbnail}
            alt={listing.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Home className="h-10 w-10 text-slate-300" />
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="mb-1 flex items-center gap-2">
          <Badge status={listing.type} />
        </div>
        <h3 className="mb-1 font-semibold text-slate-900 line-clamp-2">{listing.title}</h3>
        <div className="mb-2 flex items-center gap-1 text-sm text-slate-500">
          <MapPin className="h-3.5 w-3.5" />
          {listing.location_text}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-[#1D3B53]">
            {listing.currency} {listing.price.toLocaleString()}
          </span>
          {listing.bedrooms != null && (
            <span className="text-xs text-slate-400">
              {listing.bedrooms} bed · {listing.bathrooms} bath
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
