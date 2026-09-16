import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { ArrowLeft, Heart, MapPin, BedDouble, Bath, Ruler, CheckCircle } from "lucide-react";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/auth";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { PageSpinner } from "../../components/ui/Spinner";
import "leaflet/dist/leaflet.css";
export default function ListingDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const [activePhoto, setActivePhoto] = useState(0);
    const [booked, setBooked] = useState(false);
    const [bookingError, setBookingError] = useState(null);
    const [shortlisted, setShortlisted] = useState(false);
    const [showBookModal, setShowBookModal] = useState(false);
    const [bookForm, setBookForm] = useState({ name: "", email: "", alt_mobile: "" });
    const { data: listing, isLoading } = useQuery({
        queryKey: ["listing", id],
        queryFn: () => api.listings.detail(id, token),
        enabled: !!token && !!id,
    });
    const { data: profile } = useQuery({
        queryKey: ["customer-profile"],
        queryFn: () => api.customer.getProfile(token),
        enabled: !!token,
    });
    function openBookModal() {
        setBookForm({ name: profile?.name ?? "", email: "", alt_mobile: "" });
        setBookingError(null);
        setShowBookModal(true);
    }
    const bookMutation = useMutation({
        mutationFn: () => api.customer.createBooking(id, { name: bookForm.name, email: bookForm.email, alt_mobile: bookForm.alt_mobile || undefined }, token),
        onSuccess: () => { setBooked(true); setShowBookModal(false); },
        onError: (e) => setBookingError(e instanceof Error ? e.message : "Booking failed"),
    });
    const shortlistMutation = useMutation({
        mutationFn: () => shortlisted
            ? api.customer.removeShortlist(id, token)
            : api.customer.addShortlist(id, token),
        onSuccess: () => setShortlisted((s) => !s),
    });
    if (isLoading)
        return _jsx(PageSpinner, {});
    if (!listing)
        return _jsx("div", { className: "p-8 text-center text-slate-500", children: "Listing not found." });
    const detail = listing;
    const photos = detail.photos ?? [];
    const amenities = Array.isArray(detail.amenities) ? detail.amenities : [];
    return (
        _jsxs(_Fragment, { children: [
            _jsxs("div", { className: "min-h-screen bg-slate-50", children: [
                _jsx("header", { className: "sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm", children: _jsxs("div", { className: "mx-auto flex max-w-5xl items-center gap-4 px-4 py-4 sm:px-6", children: [_jsx("button", { onClick: () => navigate("/listings"), className: "text-slate-400 hover:text-slate-600", children: _jsx(ArrowLeft, { className: "h-5 w-5" }) }), _jsx("h1", { className: "flex-1 truncate font-semibold text-slate-900", children: detail.title }), _jsx("button", { onClick: () => shortlistMutation.mutate(), className: `rounded-full p-2 transition-colors ${shortlisted ? "text-red-500 hover:text-red-600" : "text-slate-400 hover:text-red-400"}`, children: _jsx(Heart, { className: `h-5 w-5 ${shortlisted ? "fill-current" : ""}` }) })] }) }),
                _jsx("main", { className: "mx-auto max-w-5xl px-4 py-8 sm:px-6", children: _jsxs("div", { className: "grid gap-8 lg:grid-cols-3", children: [
                    _jsxs("div", { className: "lg:col-span-2 space-y-6", children: [
                        _jsxs("div", { className: "overflow-hidden rounded-2xl bg-slate-100", children: [
                            _jsx("div", { className: "aspect-[16/9] overflow-hidden", children: photos.length > 0
                                ? _jsx("img", { src: photos[activePhoto]?.url, alt: detail.title, className: "h-full w-full object-cover" })
                                : _jsx("div", { className: "flex h-full items-center justify-center text-slate-300 text-sm", children: "No photos" }) }),
                            photos.length > 1 && (_jsx("div", { className: "flex gap-2 overflow-x-auto p-3", children: photos.map((photo, i) => (_jsx("button", { onClick: () => setActivePhoto(i), className: `shrink-0 overflow-hidden rounded-lg border-2 transition-all ${i === activePhoto ? "border-primary-500" : "border-transparent"}`, children: _jsx("img", { src: photo.url, alt: "", className: "h-16 w-24 object-cover" }) }, photo.id))) }))
                        ] }),
                        _jsxs("div", { className: "rounded-2xl bg-white p-6 shadow-sm", children: [
                            _jsxs("div", { className: "mb-3 flex flex-wrap items-center gap-3", children: [_jsx(Badge, { status: detail.type }), _jsxs("span", { className: "text-2xl font-bold text-primary-600", children: [detail.currency, " ", detail.price.toLocaleString()] })] }),
                            _jsx("h2", { className: "mb-2 text-xl font-bold text-slate-900", children: detail.title }),
                            _jsxs("div", { className: "mb-4 flex items-center gap-1 text-slate-500", children: [_jsx(MapPin, { className: "h-4 w-4" }), _jsx("span", { children: detail.location_text })] }),
                            _jsxs("div", { className: "mb-4 flex flex-wrap gap-4 text-sm text-slate-600", children: [
                                detail.bedrooms != null && (_jsxs("span", { className: "flex items-center gap-1", children: [_jsx(BedDouble, { className: "h-4 w-4" }), detail.bedrooms, " Bedrooms"] })),
                                detail.bathrooms != null && (_jsxs("span", { className: "flex items-center gap-1", children: [_jsx(Bath, { className: "h-4 w-4" }), detail.bathrooms, " Bathrooms"] })),
                                detail.size_sqft != null && (_jsxs("span", { className: "flex items-center gap-1", children: [_jsx(Ruler, { className: "h-4 w-4" }), detail.size_sqft, " sqft"] }))
                            ] }),
                            detail.description && (_jsx("p", { className: "text-sm leading-relaxed text-slate-600", children: detail.description }))
                        ] }),
                        amenities.length > 0 && (_jsxs("div", { className: "rounded-2xl bg-white p-6 shadow-sm", children: [_jsx("h3", { className: "mb-3 font-semibold text-slate-900", children: "Amenities" }), _jsx("div", { className: "flex flex-wrap gap-2", children: amenities.map((a) => (_jsxs("span", { className: "flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700", children: [_jsx(CheckCircle, { className: "h-3.5 w-3.5 text-green-500" }), a] }, a))) })] })),
                        detail.latitude != null && detail.longitude != null && (_jsx("div", { className: "overflow-hidden rounded-2xl shadow-sm", children: _jsxs(MapContainer, { center: [detail.latitude, detail.longitude], zoom: 15, style: { height: 300 }, scrollWheelZoom: false, children: [_jsx(TileLayer, { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }), _jsx(Marker, { position: [detail.latitude, detail.longitude], children: _jsx(Popup, { children: detail.title }) })] }) }))
                    ] }),
                    _jsx("div", { className: "lg:col-span-1", children: _jsxs("div", { className: "sticky top-24 rounded-2xl bg-white p-6 shadow-sm", children: [
                        _jsxs("div", { className: "mb-4 text-center", children: [_jsxs("div", { className: "text-3xl font-bold text-primary-600", children: [detail.currency, " ", detail.price.toLocaleString()] }), _jsx("div", { className: "mt-1 text-sm text-slate-500", children: "per annum" })] }),
                        _jsxs("div", { className: "mb-3 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600", children: [_jsx("p", { className: "font-medium text-slate-900", children: "Listed by" }), _jsx("p", { children: detail.vendor_name })] }),
                        booked
                            ? _jsxs("div", { className: "rounded-lg bg-green-50 px-4 py-3 text-center text-sm text-green-800", children: [_jsx(CheckCircle, { className: "mx-auto mb-1 h-5 w-5 text-green-600" }), "Booking request sent! Admin will contact you shortly."] })
                            : _jsxs(_Fragment, { children: [_jsx(Button, { className: "w-full", onClick: openBookModal, children: "Request to Book" }), _jsx("p", { className: "mt-3 text-center text-xs text-slate-400", children: "Our admin will contact you within 24 hours" })] })
                    ] }) })
                ] }) })
            ] }),
            _jsx(Modal, { open: showBookModal, onClose: () => setShowBookModal(false), title: "Request to Book", children:
                _jsxs("div", { className: "space-y-4", children: [
                    _jsx(Input, { label: "Your Name", value: bookForm.name, onChange: (e) => setBookForm((f) => ({ ...f, name: e.target.value })), placeholder: "Full name", required: true }),
                    _jsx(Input, { label: "Mobile Number", value: profile?.mobile ?? "", disabled: true, hint: "Your verified number — will be shared with admin" }),
                    _jsx(Input, { label: "Secondary Number (optional)", value: bookForm.alt_mobile, onChange: (e) => setBookForm((f) => ({ ...f, alt_mobile: e.target.value })), placeholder: "+971 50 000 0000", type: "tel" }),
                    _jsx(Input, { label: "Email", value: bookForm.email, onChange: (e) => setBookForm((f) => ({ ...f, email: e.target.value })), placeholder: "you@example.com", type: "email", required: true }),
                    bookingError && _jsx("p", { className: "text-xs text-red-600", children: bookingError }),
                    _jsxs("div", { className: "flex gap-3 justify-end pt-1", children: [
                        _jsx(Button, { variant: "secondary", onClick: () => setShowBookModal(false), children: "Cancel" }),
                        _jsx(Button, { loading: bookMutation.isPending, disabled: !bookForm.name.trim() || !bookForm.email.trim(), onClick: () => bookMutation.mutate(), children: "Submit Request" })
                    ] })
                ] })
            })
        ] })
    );
}
