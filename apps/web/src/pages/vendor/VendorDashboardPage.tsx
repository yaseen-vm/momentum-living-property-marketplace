import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, Edit2, Send, Trash2, Building2, LogOut } from "lucide-react";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/auth";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { PageSpinner } from "../../components/ui/Spinner";
import type { VendorListing } from "../../lib/api";

export default function VendorDashboardPage() {
  const navigate = useNavigate();
  const { token, clearAuth } = useAuthStore();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["vendor-listings"],
    queryFn: () => api.vendor.getListings(token!),
    enabled: !!token,
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => api.vendor.submitListing(id, token!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendor-listings"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.vendor.deleteListing(id, token!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendor-listings"] }),
  });

  const listings: VendorListing[] = data?.listings ?? [];

  const statusCounts = listings.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1;
    return acc;
  }, {});

  const summaryCards = [
    { label: "Draft", status: "draft", color: "bg-slate-100 text-slate-700" },
    { label: "Pending Review", status: "pending", color: "bg-yellow-100 text-yellow-700" },
    { label: "Approved", status: "approved", color: "bg-green-100 text-green-700" },
    { label: "Rejected", status: "rejected", color: "bg-red-100 text-red-700" },
  ];

  if (isLoading) return <PageSpinner />;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Building2 className="h-7 w-7 text-primary-600" />
            <span className="text-lg font-bold text-slate-900">Momentum Living</span>
            <span className="ml-2 rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700">
              Owner
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate("/vendor/listings/new")}
            >
              <Plus className="h-4 w-4" />
              New Listing
            </Button>
            <Button variant="ghost" size="sm" onClick={clearAuth}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-2xl font-bold text-slate-900">My Dashboard</h1>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {summaryCards.map(({ label, status, color }) => (
            <div key={status} className="rounded-xl bg-white p-5 shadow-sm">
              <div className={`mb-2 inline-flex rounded-lg px-2.5 py-1 text-xs font-medium ${color}`}>
                {label}
              </div>
              <div className="text-3xl font-extrabold text-slate-900">
                {statusCounts[status] ?? 0}
              </div>
            </div>
          ))}
        </div>

        {/* Listings */}
        <div className="rounded-xl bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="font-semibold text-slate-900">My Listings</h2>
            <span className="text-sm text-slate-500">{listings.length} total</span>
          </div>
          {listings.length === 0 ? (
            <div className="py-16 text-center">
              <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-slate-500">No listings yet.</p>
              <Button
                className="mt-4"
                onClick={() => navigate("/vendor/listings/new")}
              >
                Create your first listing
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {listings.map((listing) => (
                <div key={listing.id} className="flex items-start justify-between gap-4 px-6 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-medium text-slate-900 truncate">{listing.title}</span>
                      <Badge status={listing.status} />
                    </div>
                    <p className="text-sm text-slate-500">
                      {listing.type} · {listing.currency} {listing.price.toLocaleString()} ·{" "}
                      {listing.location_text}
                    </p>
                    {listing.admin_note && listing.status === "rejected" && (
                      <p className="mt-1 text-xs text-red-600">
                        Admin note: {listing.admin_note}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {(listing.status === "draft" || listing.status === "rejected") && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/vendor/listings/${listing.id}/edit`)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={submitMutation.isPending}
                          onClick={() => submitMutation.mutate(listing.id)}
                        >
                          <Send className="h-4 w-4" />
                          Submit
                        </Button>
                      </>
                    )}
                    {listing.status === "draft" && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          if (confirm("Delete this listing?")) deleteMutation.mutate(listing.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
