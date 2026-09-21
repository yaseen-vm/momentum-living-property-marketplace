import type {
  AdminAgent,
  AdminAgentsResponse,
  AdminContentItem,
  AdminContentResponse,
  AdminLeadDetail,
  AdminLeadsResponse,
  AdminNotificationsResponse,
  AdminPropertiesResponse,
  AdminPropertyDetail,
  AdminReportsResponse,
  AgentInput,
  AgentsResponse,
  CompleteEnquiryResponse,
  ContentAllResponse,
  CreateEnquiryResponse,
  CreateLeadRequestResponse,
  CreatePropertyResponse,
  EnquiryDetails,
  LeadRequestInput,
  LeadUpdateInput,
  MatchesResponse,
  OpportunityDetailResponse,
  OtpSendResponse,
  PropertyInput,
  RematchResponse,
  SiteContent,
  SiteContentKey,
} from "@momentum/shared";

const API_BASE = (import.meta.env["VITE_API_URL"] as string | undefined) ?? "http://localhost:8787";

/** Public URL for an R2 object under `public-media/` (MD portrait, corporate imagery). */
export function publicMediaUrl(key: string): string | null {
  return key.startsWith("public-media/") ? `${API_BASE}/upload/files/${key}` : null;
}

/** A non-2xx API response. `code` is the API error code, e.g. `NOT_QUALIFIED`. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null
  ) {
    super(message);
    this.name = "ApiError";
  }
}

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
    const code = typeof e === "object" && e !== null && "code" in e ? String((e as { code: unknown }).code) : null;
    throw new ApiError(msg, res.status, code);
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
      request<OtpSendResponse>("/auth/otp/send", {
        method: "POST",
        body: JSON.stringify({ mobile }),
      }),
    verifyOtp: (mobile: string, otp: string, intent?: "vendor" | "customer") =>
      request<OtpVerifyResponse>("/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ mobile, otp, intent }),
      }),
  },
  content: {
    all: () => request<ContentAllResponse>("/content"),
  },
  agents: {
    list: () => request<AgentsResponse>("/agents"),
  },
  availability: {
    createEnquiry: (details: EnquiryDetails, token: string) =>
      request<CreateEnquiryResponse>("/availability/enquiries", {
        method: "POST",
        body: JSON.stringify(details),
        token,
      }),
    submitRequirements: (enquiryId: string, requirements: Record<string, unknown>, token: string) =>
      request<CompleteEnquiryResponse>(`/availability/enquiries/${enquiryId}/requirements`, {
        method: "PUT",
        body: JSON.stringify(requirements),
        token,
      }),
    matches: (enquiryId: string, token: string) =>
      request<MatchesResponse>(`/availability/enquiries/${enquiryId}/matches`, { token }),
    opportunity: (id: string, enquiryId: string, token: string) =>
      request<OpportunityDetailResponse>(
        `/availability/opportunities/${id}?${new URLSearchParams({ enquiry_id: enquiryId })}`,
        { token }
      ),
    createRequest: (enquiryId: string, body: LeadRequestInput, token: string) =>
      request<CreateLeadRequestResponse>(`/availability/enquiries/${enquiryId}/requests`, {
        method: "POST",
        body: JSON.stringify(body),
        token,
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
    createBooking: (
      listingId: string,
      contact: { name: string; email: string; alt_mobile?: string },
      token: string
    ) =>
      request<{ bookingId: string }>("/customer/bookings", {
        method: "POST",
        body: JSON.stringify({ listing_id: listingId, ...contact }),
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
    leads: (params: Record<string, string>, token: string) =>
      request<AdminLeadsResponse>(`/admin/leads?${new URLSearchParams(params)}`, { token }),
    lead: (id: string, token: string) => request<AdminLeadDetail>(`/admin/leads/${id}`, { token }),
    updateLead: (id: string, body: LeadUpdateInput, token: string) =>
      request<AdminLeadDetail>(`/admin/leads/${id}`, { method: "PATCH", body: JSON.stringify(body), token }),
    rematchLead: (id: string, token: string) =>
      request<RematchResponse>(`/admin/leads/${id}/rematch`, { method: "POST", token }),

    properties: (params: Record<string, string>, token: string) =>
      request<AdminPropertiesResponse>(`/admin/properties?${new URLSearchParams(params)}`, { token }),
    property: (id: string, token: string) => request<AdminPropertyDetail>(`/admin/properties/${id}`, { token }),
    createProperty: (body: PropertyInput, token: string) =>
      request<CreatePropertyResponse>("/admin/properties", { method: "POST", body: JSON.stringify(body), token }),
    updateProperty: (id: string, body: Partial<PropertyInput>, token: string) =>
      request<AdminPropertyDetail>(`/admin/properties/${id}`, { method: "PATCH", body: JSON.stringify(body), token }),
    setPropertyAvailability: (id: string, isAvailable: boolean, token: string) =>
      request<{ id: string; is_available: boolean }>(`/admin/properties/${id}/availability`, {
        method: "POST",
        body: JSON.stringify({ is_available: isAvailable }),
        token,
      }),
    archiveProperty: (id: string, token: string) =>
      request<{ id: string; status: string }>(`/admin/properties/${id}/archive`, { method: "POST", token }),

    agents: (token: string) => request<AdminAgentsResponse>("/admin/agents", { token }),
    createAgent: (body: AgentInput, token: string) =>
      request<AdminAgent>("/admin/agents", { method: "POST", body: JSON.stringify(body), token }),
    updateAgent: (id: string, body: Partial<AgentInput>, token: string) =>
      request<AdminAgent>(`/admin/agents/${id}`, { method: "PATCH", body: JSON.stringify(body), token }),
    deleteAgent: (id: string, token: string) =>
      request<{ ok: true }>(`/admin/agents/${id}`, { method: "DELETE", token }),

    content: (token: string) => request<AdminContentResponse>("/admin/content", { token }),
    updateContent: <K extends SiteContentKey>(key: K, value: SiteContent[K], token: string) =>
      request<AdminContentItem<K>>(`/admin/content/${key}`, {
        method: "PUT",
        body: JSON.stringify({ value }),
        token,
      }),

    reports: (params: Record<string, string>, token: string) =>
      request<AdminReportsResponse>(`/admin/reports?${new URLSearchParams(params)}`, { token }),
    notifications: (token: string) => request<AdminNotificationsResponse>("/admin/notifications", { token }),
    markNotificationRead: (id: string, token: string) =>
      request<{ ok: true }>(`/admin/notifications/${id}/read`, { method: "POST", token }),
    markAllNotificationsRead: (token: string) =>
      request<{ ok: true }>("/admin/notifications/read-all", { method: "POST", token }),

    /** CSV download: returns the file as a Blob (the response is not JSON). */
    exportCsv: async (params: Record<string, string>, token: string): Promise<Blob> => {
      const res = await fetch(`${API_BASE}/admin/export?${new URLSearchParams(params)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
        throw new ApiError(err?.error?.message ?? res.statusText, res.status, err?.error?.code ?? null);
      }
      return res.blob();
    },
  },
  upload: {
    uploadFile: async (
      file: File,
      context: string,
      token: string,
      fields: Record<string, string> = {}
    ): Promise<{ key: string }> => {
      const form = new FormData();
      form.append("context", context);
      for (const [name, value] of Object.entries(fields)) form.append(name, value);
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
