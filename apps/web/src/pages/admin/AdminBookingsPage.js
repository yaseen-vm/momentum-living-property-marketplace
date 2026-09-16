import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, MessageSquarePlus } from "lucide-react";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/auth";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { PageSpinner } from "../../components/ui/Spinner";
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
    const [expandedId, setExpandedId] = useState(null);
    const [noteModal, setNoteModal] = useState(null);
    const [noteText, setNoteText] = useState("");
    const { data, isLoading } = useQuery({
        queryKey: ["admin-bookings", statusFilter],
        queryFn: () => api.admin.getBookings(statusFilter ? { status: statusFilter } : {}, token),
        enabled: !!token,
    });
    const updateMutation = useMutation({
        mutationFn: ({ id, status }) => api.admin.updateBooking(id, { status }, token),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-bookings"] }),
    });
    const noteMutation = useMutation({
        mutationFn: ({ id, body }) => api.admin.addBookingNote(id, body, token),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin-bookings"] });
            setNoteModal(null);
            setNoteText("");
        },
    });
    const bookings = data?.bookings ?? [];
    function formatDate(ts) {
        return new Date(ts).toLocaleString();
    }
    return (_jsxs("div", { className: "p-6", children: [
        _jsxs("div", { className: "mb-6 flex items-center justify-between", children: [
            _jsx("h1", { className: "text-xl font-bold text-slate-900", children: "Booking Requests" }),
            _jsxs("select", { value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), className: "rounded-lg border border-slate-300 px-3 py-2 text-sm", children: [
                _jsx("option", { value: "", children: "All Statuses" }),
                BOOKING_STATUSES.map((s) => (_jsx("option", { value: s.value, children: s.label }, s.value)))
            ] })
        ] }),
        isLoading ? (_jsx(PageSpinner, {})) : (_jsx("div", { className: "space-y-3", children: bookings.length === 0
            ? _jsx("div", { className: "py-16 text-center text-slate-400", children: "No bookings found" })
            : bookings.map((booking) => (_jsxs("div", { className: "rounded-xl bg-white shadow-sm overflow-hidden", children: [
                _jsxs("div", { className: "flex items-start justify-between p-4 cursor-pointer hover:bg-slate-50", onClick: () => setExpandedId(expandedId === booking.id ? null : booking.id), children: [
                    _jsxs("div", { className: "flex-1 min-w-0", children: [
                        _jsxs("div", { className: "flex items-center gap-3 mb-1", children: [
                            _jsx("span", { className: "font-medium text-slate-900", children: booking.listing?.title }),
                            _jsx(Badge, { status: booking.status })
                        ] }),
                        _jsxs("div", { className: "flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500", children: [
                            _jsxs("span", { children: [
                                "Customer: ", booking.customer?.name,
                                " (", booking.customer?.mobile, ")",
                                booking.customer?.email ? ` · ${booking.customer.email}` : "",
                                booking.customer?.alt_mobile ? ` · Alt: ${booking.customer.alt_mobile}` : ""
                            ] }),
                            _jsxs("span", { children: ["Owner: ", booking.vendor?.name, " (", booking.vendor?.mobile, ")"] }),
                            _jsxs("span", { children: [booking.listing?.type, " · ", booking.listing?.location_text] }),
                            _jsx("span", { children: formatDate(booking.created_at) })
                        ] })
                    ] }),
                    _jsx("div", { className: "ml-4 text-slate-400", children: expandedId === booking.id ? _jsx(ChevronUp, { className: "h-4 w-4" }) : _jsx(ChevronDown, { className: "h-4 w-4" }) })
                ] }),
                expandedId === booking.id && (_jsxs("div", { className: "border-t border-slate-100 p-4 space-y-4", children: [
                    _jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [
                        _jsxs("div", { className: "rounded-lg bg-slate-50 p-3 text-sm space-y-1", children: [
                            _jsx("p", { className: "font-medium text-slate-700 mb-1", children: "Customer Contact" }),
                            _jsxs("p", { className: "text-slate-600", children: ["Name: ", booking.customer?.name] }),
                            _jsxs("p", { className: "text-slate-600", children: ["Mobile: ", booking.customer?.mobile] }),
                            booking.customer?.alt_mobile && _jsxs("p", { className: "text-slate-600", children: ["Alt Mobile: ", booking.customer.alt_mobile] }),
                            booking.customer?.email && _jsxs("p", { className: "text-slate-600", children: ["Email: ", booking.customer.email] })
                        ] }),
                        _jsxs("div", { className: "rounded-lg bg-blue-50 p-3 text-sm space-y-1", children: [
                            _jsx("p", { className: "font-medium text-slate-700 mb-1", children: "Property Details" }),
                            _jsxs("p", { className: "text-slate-600", children: ["Type: ", booking.listing?.type] }),
                            _jsxs("p", { className: "text-slate-600", children: ["Location: ", booking.listing?.location_text] }),
                            _jsxs("p", { className: "font-semibold text-slate-800", children: [booking.listing?.currency, " ", booking.listing?.price?.toLocaleString(), " / year"] }),
                            booking.listing?.size_sqft && _jsxs("p", { className: "text-slate-600", children: ["Size: ", booking.listing.size_sqft, " sqft"] }),
                            booking.listing?.bedrooms != null && _jsxs("p", { className: "text-slate-600", children: ["Bedrooms: ", booking.listing.bedrooms] }),
                            booking.listing?.bathrooms != null && _jsxs("p", { className: "text-slate-600", children: ["Bathrooms: ", booking.listing.bathrooms] }),
                            booking.listing?.total_capacity && _jsxs("p", { className: "text-slate-600", children: ["Capacity: ", booking.listing.total_capacity, " persons"] }),
                            booking.listing?.num_rooms && _jsxs("p", { className: "text-slate-600", children: ["Rooms: ", booking.listing.num_rooms] })
                        ] })
                    ] }),
                    _jsxs("div", { className: "flex items-center gap-3", children: [
                        _jsx("span", { className: "text-sm font-medium text-slate-700", children: "Update Status:" }),
                        _jsx("div", { className: "flex gap-2 flex-wrap", children: BOOKING_STATUSES.map((s) => (_jsx("button", { onClick: () => updateMutation.mutate({ id: booking.id, status: s.value }), disabled: booking.status === s.value || updateMutation.isPending, className: `rounded-full px-3 py-1 text-xs font-medium transition-colors ${booking.status === s.value ? "bg-primary-100 text-primary-700 cursor-default" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`, children: s.label }, s.value))) })
                    ] }),
                    booking.notes && booking.notes.length > 0 && (_jsxs("div", { children: [
                        _jsx("p", { className: "mb-2 text-sm font-medium text-slate-700", children: "Notes" }),
                        _jsx("div", { className: "space-y-2", children: booking.notes.map((note) => (_jsxs("div", { className: "rounded-lg bg-slate-50 px-3 py-2 text-sm", children: [_jsx("p", { className: "text-slate-700", children: note.body }), _jsx("p", { className: "mt-1 text-xs text-slate-400", children: formatDate(note.created_at) })] }, note.id))) })
                    ] })),
                    _jsxs(Button, { variant: "secondary", size: "sm", onClick: () => { setNoteModal(booking.id); setNoteText(""); }, children: [_jsx(MessageSquarePlus, { className: "h-4 w-4" }), "Add Note"] })
                ] }))
            ] }, booking.id)))
        })),
        _jsx(Modal, { open: !!noteModal, onClose: () => setNoteModal(null), title: "Add Internal Note", children:
            _jsxs("div", { className: "space-y-4", children: [
                _jsx("textarea", { value: noteText, onChange: (e) => setNoteText(e.target.value), rows: 4, className: "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none", placeholder: "Internal note about this booking…" }),
                _jsxs("div", { className: "flex gap-3 justify-end", children: [
                    _jsx(Button, { variant: "secondary", onClick: () => setNoteModal(null), children: "Cancel" }),
                    _jsx(Button, { loading: noteMutation.isPending, disabled: !noteText.trim(), onClick: () => noteModal && noteMutation.mutate({ id: noteModal, body: noteText }), children: "Add Note" })
                ] })
            ] })
        })
    ] }));
}
