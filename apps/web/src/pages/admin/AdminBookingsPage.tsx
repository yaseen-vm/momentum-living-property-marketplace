import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, MessageSquarePlus } from "lucide-react";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/auth";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { PageSpinner } from "../../components/ui/Spinner";
import type { AdminBooking } from "../../lib/api";

const BOOKING_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "owner_confirmed", label: "Owner Confirmed" },
  { value: "customer_contacted", label: "Customer Contacted" },
  { value: "closed", label: "Closed" },
];

export default function AdminBookingsPage() {
  const { token } = useAuthStore();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteModal, setNoteModal] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-bookings", statusFilter],
    queryFn: () => api.admin.getBookings(statusFilter ? { status: statusFilter } : {}, token!),
    enabled: !!token,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.admin.updateBooking(id, { status }, token!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-bookings"] }),
  });

  const noteMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      api.admin.addBookingNote(id, body, token!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      setNoteModal(null);
      setNoteText("");
    },
  });

  const bookings: AdminBooking[] = data?.bookings ?? [];

  function formatDate(ts: number) {
    return new Date(ts).toLocaleString();
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Booking Requests</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          {BOOKING_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : (
        <div className="space-y-3">
          {bookings.length === 0 ? (
            <div className="py-16 text-center text-slate-400">No bookings found</div>
          ) : (
            bookings.map((booking) => (
              <div key={booking.id} className="rounded-xl bg-white shadow-sm overflow-hidden">
                <div
                  className="flex items-start justify-between p-4 cursor-pointer hover:bg-slate-50"
                  onClick={() => setExpandedId(expandedId === booking.id ? null : booking.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-medium text-slate-900">{booking.listing_title}</span>
                      <Badge status={booking.status} />
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>Customer: {booking.customer_name} ({booking.customer_mobile})</span>
                      <span>Owner: {booking.vendor_name} ({booking.vendor_mobile})</span>
                      <span>{booking.listing_type} · {booking.listing_location}</span>
                      <span>{formatDate(booking.created_at)}</span>
                    </div>
                  </div>
                  <div className="ml-4 text-slate-400">
                    {expandedId === booking.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>

                {expandedId === booking.id && (
                  <div className="border-t border-slate-100 p-4 space-y-4">
                    {/* Status update */}
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-700">Update Status:</span>
                      <div className="flex gap-2 flex-wrap">
                        {BOOKING_STATUSES.map((s) => (
                          <button
                            key={s.value}
                            onClick={() => updateMutation.mutate({ id: booking.id, status: s.value })}
                            disabled={booking.status === s.value || updateMutation.isPending}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                              booking.status === s.value
                                ? "bg-primary-100 text-primary-700 cursor-default"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Notes */}
                    {booking.notes && booking.notes.length > 0 && (
                      <div>
                        <p className="mb-2 text-sm font-medium text-slate-700">Notes</p>
                        <div className="space-y-2">
                          {booking.notes.map((note) => (
                            <div key={note.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                              <p className="text-slate-700">{note.body}</p>
                              <p className="mt-1 text-xs text-slate-400">{formatDate(note.created_at)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => { setNoteModal(booking.id); setNoteText(""); }}
                    >
                      <MessageSquarePlus className="h-4 w-4" />
                      Add Note
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      <Modal open={!!noteModal} onClose={() => setNoteModal(null)} title="Add Internal Note">
        <div className="space-y-4">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
            placeholder="Internal note about this booking…"
          />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setNoteModal(null)}>Cancel</Button>
            <Button
              loading={noteMutation.isPending}
              disabled={!noteText.trim()}
              onClick={() => noteModal && noteMutation.mutate({ id: noteModal, body: noteText })}
            >
              Add Note
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
