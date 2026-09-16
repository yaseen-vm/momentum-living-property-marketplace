import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, Edit2, Send, Trash2, Home, LogOut, Clock, CheckCircle2, XCircle, FileEdit } from "lucide-react";
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
    { label: "Drafts", status: "draft", icon: FileEdit, bgColor: "bg-slate-100", iconColor: "text-slate-600" },
    { label: "Under Review", status: "pending", icon: Clock, bgColor: "bg-amber-100", iconColor: "text-amber-700" },
    { label: "Live", status: "approved", icon: CheckCircle2, bgColor: "bg-emerald-100", iconColor: "text-emerald-700" },
    { label: "Needs Changes", status: "rejected", icon: XCircle, bgColor: "bg-red-100", iconColor: "text-red-700" },
  ];

  if (isLoading) return <PageSpinner />;

  return (
    <div className="min-h-screen bg-slate-50">
      <header style={{ backgroundColor: '#1D3B53' }} className="shadow-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <div className="text-lg font-bold italic font-serif text-white">
              Momentum<span className="font-sans font-semibold not-italic">Living</span>
            </div>
            <div className="text-xs text-slate-300">Owner Dashboard</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/vendor/listings/new")}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#1D3B53] hover:bg-slate-100 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Listing
            </button>
            <button onClick={clearAuth} className="p-2 text-slate-300 hover:text-white transition-colors" title="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-2">
          <h1 className="text-2xl font-serif font-bold text-slate-900">My Properties</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your listings and track their approval status.</p>
        </div>

        {/* Stats */}
        <div className="mt-6 mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {summaryCards.map(({ label, status, icon: Icon, bgColor, iconColor }) => (
            <div key={status} className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
              <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${bgColor}`}>
                <Icon className={`h-5 w-5 ${iconColor}`} />
              </div>
              <div className="text-3xl font-extrabold text-slate-900">
                {statusCounts[status] ?? 0}
              </div>
              <div className="mt-1 text-sm text-slate-500">{label}</div>
            </div>
          ))}
        </div>

        {/* Listings */}
        <div className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="font-semibold text-slate-900">All Listings</h2>
            <span className="text-sm text-slate-400">{listings.length} total</span>
          </div>
          {listings.length === 0 ? (
            <div className="py-20 text-center">
              <Home className="mx-auto mb-4 h-12 w-12 text-slate-200" />
              <p className="font-medium text-slate-700">No listings yet</p>
              <p className="mt-1 text-sm text-slate-400">Create your first listing to get started.</p>
              <Button
                className="mt-5"
                onClick={() => navigate("/vendor/listings/new")}
              >
                <Plus className="h-4 w-4" />
                Create a Listing
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {listings.map((listing) => (
                <div key={listing.id} className="flex items-start justify-between gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
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
                      <p className="mt-1.5 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg inline-block">
                        Admin feedback: {listing.admin_note}
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
                          title="Edit listing"
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
                          if (confirm("Delete this listing? This cannot be undone.")) deleteMutation.mutate(listing.id);
                        }}
                        title="Delete listing"
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
