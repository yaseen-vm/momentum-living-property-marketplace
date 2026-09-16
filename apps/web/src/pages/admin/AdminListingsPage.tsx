import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/auth";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { PageSpinner } from "../../components/ui/Spinner";
import type { AdminListing } from "../../lib/api";

const remarksSchema = z.object({ remarks: z.string().min(5, "Remarks required") });
type RemarksForm = z.infer<typeof remarksSchema>;

type ActionType = "reject" | "request-changes" | null;

export default function AdminListingsPage() {
  const { token } = useAuthStore();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [actionModal, setActionModal] = useState<{ id: string; type: ActionType } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-listings", statusFilter],
    queryFn: () => api.admin.getListings({ status: statusFilter }, token!),
    enabled: !!token,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.admin.approveListing(id, token!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-listings"] }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks: string }) =>
      api.admin.rejectListing(id, remarks, token!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-listings"] });
      setActionModal(null);
    },
  });

  const changesMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks: string }) =>
      api.admin.requestChanges(id, remarks, token!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-listings"] });
      setActionModal(null);
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RemarksForm>({ resolver: zodResolver(remarksSchema) });

  const listings: AdminListing[] = data?.listings ?? [];

  function formatDate(ts: number) {
    return new Date(ts).toLocaleDateString();
  }

  function handleAction(data: RemarksForm) {
    if (!actionModal) return;
    if (actionModal.type === "reject") {
      rejectMutation.mutate({ id: actionModal.id, remarks: data.remarks });
    } else if (actionModal.type === "request-changes") {
      changesMutation.mutate({ id: actionModal.id, remarks: data.remarks });
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Listing Approval</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : (
        <div className="rounded-xl bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Title</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Price</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Location</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Owner</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Submitted</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {listings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No listings in this queue
                  </td>
                </tr>
              ) : (
                listings.map((listing) => (
                  <tr key={listing.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900 max-w-xs truncate">
                      {listing.title}
                    </td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{listing.type}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {listing.currency} {listing.price.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{listing.location_text}</td>
                    <td className="px-4 py-3 text-slate-600">{listing.vendor_name}</td>
                    <td className="px-4 py-3"><Badge status={listing.status} /></td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(listing.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {listing.status === "pending" && (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              loading={approveMutation.isPending}
                              onClick={() => approveMutation.mutate(listing.id)}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setActionModal({ id: listing.id, type: "request-changes" });
                                reset();
                              }}
                            >
                              Changes
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => {
                                setActionModal({ id: listing.id, type: "reject" });
                                reset();
                              }}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!actionModal}
        onClose={() => setActionModal(null)}
        title={actionModal?.type === "reject" ? "Reject Listing" : "Request Changes"}
      >
        <form onSubmit={handleSubmit(handleAction)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {actionModal?.type === "reject" ? "Rejection Reason" : "Remarks for Owner"}
            </label>
            <textarea
              {...register("remarks")}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
              placeholder="Describe the issue or required changes…"
            />
            {errors.remarks && <p className="mt-1 text-xs text-red-600">{errors.remarks.message}</p>}
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" type="button" onClick={() => setActionModal(null)}>
              Cancel
            </Button>
            <Button
              variant={actionModal?.type === "reject" ? "danger" : "primary"}
              type="submit"
              loading={rejectMutation.isPending || changesMutation.isPending}
            >
              {actionModal?.type === "reject" ? "Reject" : "Request Changes"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
