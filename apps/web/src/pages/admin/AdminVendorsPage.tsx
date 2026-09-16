import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ExternalLink } from "lucide-react";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/auth";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { PageSpinner } from "../../components/ui/Spinner";
import type { AdminVendor, AdminVendorDetail } from "../../lib/api";

const rejectSchema = z.object({ reason: z.string().min(5, "Reason required") });
type RejectForm = z.infer<typeof rejectSchema>;

export default function AdminVendorsPage() {
  const { token } = useAuthStore();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-vendors", statusFilter],
    queryFn: () => api.admin.getVendors({ status: statusFilter }, token!),
    enabled: !!token,
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["admin-vendor-detail", selectedId],
    queryFn: () => api.admin.getVendor(selectedId!, token!),
    enabled: !!selectedId && !!token,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.admin.approveVendor(id, token!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-vendors"] });
      setSelectedId(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.admin.rejectVendor(id, reason, token!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-vendors"] });
      setRejectingId(null);
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RejectForm>({ resolver: zodResolver(rejectSchema) });

  const vendors: AdminVendor[] = data?.vendors ?? [];

  function formatDate(ts: number) {
    return new Date(ts).toLocaleDateString();
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Vendor Verification</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : (
        <div className="rounded-xl bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Mobile</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Submitted</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vendors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No vendors in this queue
                  </td>
                </tr>
              ) : (
                vendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{vendor.name}</td>
                    <td className="px-4 py-3 text-slate-600">{vendor.mobile}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{vendor.vendor_type}</td>
                    <td className="px-4 py-3"><Badge status={vendor.status} /></td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(vendor.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedId(vendor.id)}>
                          View
                        </Button>
                        {vendor.status === "pending" && (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              loading={approveMutation.isPending}
                              onClick={() => approveMutation.mutate(vendor.id)}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => {
                                setRejectingId(vendor.id);
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

      {/* Detail modal */}
      <Modal
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        title="Vendor Details"
        size="lg"
      >
        {detailLoading ? (
          <PageSpinner />
        ) : detail ? (
          <VendorDetailView
            detail={detail as AdminVendorDetail}
            onApprove={() => approveMutation.mutate(detail.id)}
            approving={approveMutation.isPending}
            onReject={() => {
              setSelectedId(null);
              setRejectingId(detail.id);
              reset();
            }}
          />
        ) : null}
      </Modal>

      {/* Reject modal */}
      <Modal
        open={!!rejectingId}
        onClose={() => setRejectingId(null)}
        title="Reject Vendor"
      >
        <form
          onSubmit={handleSubmit((data) => {
            if (rejectingId) rejectMutation.mutate({ id: rejectingId, reason: data.reason });
          })}
          className="space-y-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Rejection Reason</label>
            <textarea
              {...register("reason")}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
              placeholder="Explain why the vendor was rejected…"
            />
            {errors.reason && <p className="mt-1 text-xs text-red-600">{errors.reason.message}</p>}
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" type="button" onClick={() => setRejectingId(null)}>
              Cancel
            </Button>
            <Button variant="danger" type="submit" loading={rejectMutation.isPending}>
              Reject Vendor
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function VendorDetailView({
  detail,
  onApprove,
  approving,
  onReject,
}: {
  detail: AdminVendorDetail;
  onApprove: () => void;
  approving: boolean;
  onReject: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><span className="font-medium text-slate-700">Name:</span> {detail.name}</div>
        <div><span className="font-medium text-slate-700">Mobile:</span> {detail.mobile}</div>
        <div><span className="font-medium text-slate-700">Type:</span> <span className="capitalize">{detail.vendor_type}</span></div>
        <div><span className="font-medium text-slate-700">Status:</span> <Badge status={detail.status} /></div>
        {detail.company_name && (
          <div><span className="font-medium text-slate-700">Company:</span> {detail.company_name}</div>
        )}
        {detail.licence_no && (
          <div><span className="font-medium text-slate-700">Licence:</span> {detail.licence_no}</div>
        )}
      </div>
      {detail.documents.length > 0 && (
        <div>
          <p className="mb-2 font-medium text-slate-700 text-sm">Documents</p>
          <div className="space-y-2">
            {detail.documents.map((doc) => (
              <a
                key={doc.id}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-primary-600 hover:bg-slate-50"
              >
                <ExternalLink className="h-4 w-4" />
                {doc.label}
              </a>
            ))}
          </div>
        </div>
      )}
      {detail.status === "pending" && (
        <div className="flex gap-3 pt-2">
          <Button variant="primary" loading={approving} onClick={onApprove}>
            Approve
          </Button>
          <Button variant="danger" onClick={onReject}>
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
