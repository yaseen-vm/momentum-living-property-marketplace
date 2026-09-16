const API_BASE = (import.meta.env["VITE_API_URL"] as string | undefined) ?? "http://localhost:8787";

async function request<T>(path: string, options?: RequestInit & { token?: string }): Promise<T> {
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
    const e = (err as { error: unknown }).error;
    const msg = typeof e === "string" ? e : typeof e === "object" && e !== null && "message" in e ? String((e as { message: unknown }).message) : res.statusText;
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export interface OtpVerifyResponse {
  token: string;
  user: { id: string; role: string; mobile_verified: boolean };
}

export const api = {
  auth: {
    sendOtp: (mobile: string) =>
      request<{ message: string }>("/auth/otp/send", {
        method: "POST",
        body: JSON.stringify({ mobile }),
      }),
    verifyOtp: (mobile: string, otp: string, intent?: "vendor" | "customer") =>
      request<OtpVerifyResponse>("/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ mobile, otp, intent }),
      }),
  },
  listings: {
    browse: (params: Record<string, string>, token: string) =>
      request<{ listings: ListingSummary[]; total: number; page: number; limit: number }>(
        `/listings?${new URLSearchParams(params)}`,
        { token }
      ),
    detail: (id: string, token: string) => request<ListingDetail>(`/listings/${id}`, { token }),
  },
  vendor: {
    getProfile: (token: string) => request<VendorProfile>("/vendor/profile", { token }),
    register: (body: VendorRegisterBody, token: string) =>
      request<{ message: string }>("/vendor/register", {
        method: "POST",
        body: JSON.stringify(body),
        token,
      }),
    getListings: (token: string) => request<{ listings: VendorListing[] }>("/vendor/listings", { token }),
    getListing: (id: string, token: string) => request<VendorListing>(`/vendor/listings/${id}`, { token }),
    createListing: (body: ListingFormData, token: string) =>
      request<{ listingId: string }>("/vendor/listings", {
        method: "POST",
        body: JSON.stringify(body),
        token,
      }),
    updateListing: (id: string, body: Partial<ListingFormData>, token: string) =>
      request<{ message: string }>(`/vendor/listings/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
        token,
      }),
    submitListing: (id: string, token: string) =>
      request<{ message: string }>(`/vendor/listings/${id}/submit`, { method: "POST", token }),
    deleteListing: (id: string, token: string) =>
      request<{ message: string }>(`/vendor/listings/${id}`, { method: "DELETE", token }),
  },
  customer: {
    getProfile: (token: string) => request<CustomerProfile>("/customer/profile", { token }),
    updateProfile: (body: { name: string }, token: string) =>
      request<{ message: string }>("/customer/profile", {
        method: "PUT",
        body: JSON.stringify(body),
        token,
      }),
    createBooking: (listingId: string, token: string) =>
      request<{ bookingId: string }>("/customer/bookings", {
        method: "POST",
        body: JSON.stringify({ listing_id: listingId }),
        token,
      }),
    getBookings: (token: string) =>
      request<{ bookings: CustomerBooking[] }>("/customer/bookings", { token }),
    addShortlist: (listingId: string, token: string) =>
      request<{ message: string }>("/customer/shortlists", {
        method: "POST",
        body: JSON.stringify({ listing_id: listingId }),
        token,
      }),
    removeShortlist: (listingId: string, token: string) =>
      request<{ message: string }>(`/customer/shortlists/${listingId}`, {
        method: "DELETE",
        token,
      }),
    getShortlists: (token: string) =>
      request<{ shortlists: ListingSummary[] }>("/customer/shortlists", { token }),
  },
  admin: {
    getVendors: (params: Record<string, string>, token: string) =>
      request<{ vendors: AdminVendor[]; total: number }>(`/admin/vendors?${new URLSearchParams(params)}`, { token }),
    getVendor: (id: string, token: string) => request<AdminVendorDetail>(`/admin/vendors/${id}`, { token }),
    approveVendor: (id: string, token: string) =>
      request<{ message: string }>(`/admin/vendors/${id}/approve`, { method: "POST", token }),
    rejectVendor: (id: string, reason: string, token: string) =>
      request<{ message: string }>(`/admin/vendors/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
        token,
      }),
    getListings: (params: Record<string, string>, token: string) =>
      request<{ listings: AdminListing[]; total: number }>(`/admin/listings?${new URLSearchParams(params)}`, { token }),
    approveListing: (id: string, token: string) =>
      request<{ message: string }>(`/admin/listings/${id}/approve`, { method: "POST", token }),
    rejectListing: (id: string, reason: string, token: string) =>
      request<{ message: string }>(`/admin/listings/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
        token,
      }),
    requestChanges: (id: string, remarks: string, token: string) =>
      request<{ message: string }>(`/admin/listings/${id}/request-changes`, {
        method: "POST",
        body: JSON.stringify({ remarks }),
        token,
      }),
    getBookings: (params: Record<string, string>, token: string) =>
      request<{ bookings: AdminBooking[]; total: number }>(`/admin/bookings?${new URLSearchParams(params)}`, { token }),
    updateBooking: (id: string, body: { status?: string; admin_note?: string }, token: string) =>
      request<{ message: string }>(`/admin/bookings/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
        token,
      }),
    addBookingNote: (id: string, body: string, token: string) =>
      request<{ message: string }>(`/admin/bookings/${id}/notes`, {
        method: "POST",
        body: JSON.stringify({ body }),
        token,
      }),
    getReports: (params: Record<string, string>, token: string) =>
      request<AdminReports>(`/admin/reports?${new URLSearchParams(params)}`, { token }),
    getNotifications: (token: string) =>
      request<{ notifications: AdminNotification[]; unread_count: number }>("/admin/notifications", { token }),
    markNotificationRead: (id: string, token: string) =>
      request<{ message: string }>(`/admin/notifications/${id}/read`, { method: "PUT", token }),
  },
  upload: {
    uploadFile: async (file: File, context: string, token: string): Promise<{ key: string }> => {
      const form = new FormData();
      form.append("context", context);
      form.append("file", file);
      const res = await fetch(`${API_BASE}/upload/file`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: res.statusText } })) as { error: { message: string } };
        throw new Error(err.error?.message ?? res.statusText);
      }
      return res.json() as Promise<{ key: string }>;
    },
  },
};

// Shared response types
export interface ListingSummary {
  id: string;
  type: string;
  status: string;
  title: string;
  price: number;
  currency: string;
  location_text: string;
  location_slug: string;
  bedrooms: number | null;
  bathrooms: number | null;
  size_sqft: number | null;
  thumbnail: string | null;
  published_at: number | null;
  created_at: number;
}

export interface ListingDetail extends ListingSummary {
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  amenities: string[];
  photos: Array<{ id: string; url: string; display_order: number }>;
  vendor_name: string;
  admin_note: string | null;
}

export interface VendorProfile {
  id: string;
  name: string;
  mobile: string;
  vendor_type: string;
  status: string;
  company_name: string | null;
  trade_licence_no: string | null;
  vat_no: string | null;
  authorized_signatory: string | null;
  whatsapp_no: string | null;
  admin_note: string | null;
  documents: Array<{ id: string; label: string; r2_key: string; url?: string }>;
}

export interface VendorRegisterBody {
  vendor_type: string;
  company_name?: string;
  trade_licence_no?: string;
  vat_no?: string;
  authorized_signatory?: string;
  whatsapp_no?: string;
  document_r2_keys: Array<{ label: string; r2_key: string }>;
}

export interface ListingFormData {
  type: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  location_text: string;
  location_slug: string;
  size_sqft?: number;
  // Labour camp
  num_rooms?: number;
  persons_per_room?: number;
  room_size_sqft?: number;
  total_capacity?: number;
  mohre_certified?: boolean;
  ejari_registered?: boolean;
  // Warehouse
  num_loading_bays?: number;
  year_built?: number;
  // Land
  freehold?: boolean;
  // Financial
  security_deposit_pct?: number;
  commission_pct?: number;
  ejari_fee?: number;
  admin_fee?: number;
  amenities: string[];
  photo_r2_keys: Array<{ r2_key: string; display_order: number }>;
}

export interface VendorListing {
  id: string;
  type: string;
  status: string;
  title: string;
  price: number;
  currency: string;
  location_text: string;
  admin_note: string | null;
  created_at: number;
  updated_at: number;
}

export interface CustomerProfile {
  id: string;
  name: string;
  mobile: string;
}

export interface CustomerBooking {
  id: string;
  status: string;
  listing_id: string;
  listing_title: string;
  listing_type: string;
  listing_location: string;
  thumbnail: string | null;
  created_at: number;
}

export interface AdminVendor {
  id: string;
  user_id: string;
  name: string;
  mobile: string;
  vendor_type: string;
  status: string;
  company_name: string | null;
  created_at: number;
}

export interface AdminVendorDetail extends AdminVendor {
  licence_no: string | null;
  admin_note: string | null;
  documents: Array<{ id: string; label: string; url: string }>;
}

export interface AdminListing {
  id: string;
  title: string;
  type: string;
  status: string;
  price: number;
  currency: string;
  location_text: string;
  vendor_name: string;
  admin_note: string | null;
  created_at: number;
}

export interface AdminBooking {
  id: string;
  status: string;
  customer_name: string;
  customer_mobile: string;
  listing_title: string;
  listing_type: string;
  listing_location: string;
  vendor_name: string;
  vendor_mobile: string;
  admin_note: string | null;
  created_at: number;
  notes: Array<{ id: string; body: string; created_at: number }>;
}

export interface AdminReports {
  listings_by_status: Record<string, number>;
  vendors_by_status: Record<string, number>;
  customers_total: number;
  bookings_by_status: Record<string, number>;
  listings_by_type: Record<string, number>;
}

export interface AdminNotification {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  read_at: number | null;
  created_at: number;
}
