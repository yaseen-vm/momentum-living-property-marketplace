const API_BASE = import.meta.env["VITE_API_URL"] ?? "http://localhost:8787";
async function request(path, options) {
    const { token, headers: extraHeaders, ...init } = options ?? {};
    const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(extraHeaders ?? {}),
        },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        const e = err.error;
        const msg = typeof e === "string" ? e : typeof e === "object" && e !== null && "message" in e ? String(e.message) : res.statusText;
        throw new Error(msg);
    }
    return res.json();
}
export const api = {
    auth: {
        sendOtp: (mobile) => request("/auth/otp/send", {
            method: "POST",
            body: JSON.stringify({ mobile }),
        }),
        verifyOtp: (mobile, otp, intent) => request("/auth/otp/verify", {
            method: "POST",
            body: JSON.stringify({ mobile, otp, intent }),
        }),
    },
    listings: {
        browse: (params, token) => request(`/listings?${new URLSearchParams(params)}`, { token }),
        detail: (id, token) => request(`/listings/${id}`, { token }),
    },
    vendor: {
        getProfile: (token) => request("/vendor/profile", { token }),
        register: (body, token) => request("/vendor/register", {
            method: "POST",
            body: JSON.stringify(body),
            token,
        }),
        getListings: (token) => request("/vendor/listings", { token }),
        getListing: (id, token) => request(`/vendor/listings/${id}`, { token }),
        createListing: (body, token) => request("/vendor/listings", {
            method: "POST",
            body: JSON.stringify(body),
            token,
        }),
        updateListing: (id, body, token) => request(`/vendor/listings/${id}`, {
            method: "PUT",
            body: JSON.stringify(body),
            token,
        }),
        submitListing: (id, token) => request(`/vendor/listings/${id}/submit`, { method: "POST", token }),
        deleteListing: (id, token) => request(`/vendor/listings/${id}`, { method: "DELETE", token }),
    },
    customer: {
        getProfile: (token) => request("/customer/profile", { token }),
        updateProfile: (body, token) => request("/customer/profile", {
            method: "PUT",
            body: JSON.stringify(body),
            token,
        }),
        createBooking: (listingId, { name, email, alt_mobile }, token) => request("/customer/bookings", {
            method: "POST",
            body: JSON.stringify({ listing_id: listingId, name, email, alt_mobile }),
            token,
        }),
        getBookings: (token) => request("/customer/bookings", { token }),
        addShortlist: (listingId, token) => request("/customer/shortlists", {
            method: "POST",
            body: JSON.stringify({ listing_id: listingId }),
            token,
        }),
        removeShortlist: (listingId, token) => request(`/customer/shortlists/${listingId}`, {
            method: "DELETE",
            token,
        }),
        getShortlists: (token) => request("/customer/shortlists", { token }),
    },
    admin: {
        getVendors: (params, token) => request(`/admin/vendors?${new URLSearchParams(params)}`, { token }),
        getVendor: (id, token) => request(`/admin/vendors/${id}`, { token }),
        approveVendor: (id, token) => request(`/admin/vendors/${id}/approve`, { method: "POST", token }),
        rejectVendor: (id, reason, token) => request(`/admin/vendors/${id}/reject`, {
            method: "POST",
            body: JSON.stringify({ reason }),
            token,
        }),
        getListings: (params, token) => request(`/admin/listings?${new URLSearchParams(params)}`, { token }),
        approveListing: (id, token) => request(`/admin/listings/${id}/approve`, { method: "POST", token }),
        rejectListing: (id, reason, token) => request(`/admin/listings/${id}/reject`, {
            method: "POST",
            body: JSON.stringify({ reason }),
            token,
        }),
        requestChanges: (id, remarks, token) => request(`/admin/listings/${id}/request-changes`, {
            method: "POST",
            body: JSON.stringify({ remarks }),
            token,
        }),
        getBookings: (params, token) => request(`/admin/bookings?${new URLSearchParams(params)}`, { token }),
        updateBooking: (id, body, token) => request(`/admin/bookings/${id}`, {
            method: "PUT",
            body: JSON.stringify(body),
            token,
        }),
        addBookingNote: (id, body, token) => request(`/admin/bookings/${id}/notes`, {
            method: "POST",
            body: JSON.stringify({ body }),
            token,
        }),
        getReports: (params, token) => request(`/admin/reports?${new URLSearchParams(params)}`, { token }),
        getNotifications: (token) => request("/admin/notifications", { token }),
        markNotificationRead: (id, token) => request(`/admin/notifications/${id}/read`, { method: "PUT", token }),
    },
    upload: {
        uploadFile: async (file, context, token) => {
            const form = new FormData();
            form.append("context", context);
            form.append("file", file);
            const res = await fetch(`${API_BASE}/upload/file`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: form,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
                throw new Error(err.error?.message ?? res.statusText);
            }
            return res.json();
        },
    },
};
