// ─── Domain literals ────────────────────────────────────────────────────────

export type Role = "customer" | "vendor" | "admin";

export type VendorStatus = "pending" | "approved" | "rejected";

export type VendorType = "landlord" | "company" | "agent" | "broker";

export type ListingType = "property" | "plot" | "room";

export type ListingStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "rented_sold"
  | "withdrawn";

export type BookingStatus =
  | "pending"
  | "owner_confirmed"
  | "customer_contacted"
  | "closed";

export type NotificationType = "new_lead" | "lead_request" | "new_booking" | "vendor_pending" | "listing_pending";

export type AgentType = "otp_send" | "notification" | "moderation" | "csv_export" | "embedding";

export type AgentStatus = "pending" | "running" | "completed" | "failed";

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;
  role: Role;
  mobile_verified: boolean;
  exp: number;
}

export interface ApiError {
  error: { code: string; message: string };
}

// ─── Auth request/response shapes ────────────────────────────────────────────

export interface OtpSendRequest {
  mobile: string;
}

export interface OtpSendResponse {
  expires_in: number;
  /** Seconds before the client may offer "Resend OTP". */
  resend_after: number;
}

export interface OtpVerifyRequest {
  mobile: string;
  code: string;
  intent?: "vendor" | "customer";
}

export interface OtpVerifyResponse {
  token: string;
  user: {
    id: string;
    role: Role;
    mobile_verified: boolean;
  };
}

// ─── Listing shapes ──────────────────────────────────────────────────────────

export interface ListingSummary {
  id: string;
  type: ListingType;
  title: string;
  price: number;
  currency: string;
  location_text: string;
  size_sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  cover_photo_url: string | null;
  published_at: number | null;
}

export interface ListingDetail extends ListingSummary {
  description: string | null;
  location_slug: string;
  latitude: number | null;
  longitude: number | null;
  amenities: string[];
  photos: Array<{ url: string; display_order: number }>;
  status: ListingStatus;
}

export interface ListingsResponse {
  listings: ListingSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateListingRequest {
  type: ListingType;
  title: string;
  description?: string;
  price: number;
  currency?: string;
  location_slug: string;
  location_text: string;
  latitude?: number;
  longitude?: number;
  size_sqft?: number;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
  photo_keys?: string[];
}

export type UpdateListingRequest = Partial<CreateListingRequest>;

// ─── Customer shapes ─────────────────────────────────────────────────────────

export interface CustomerProfile {
  id: string;
  name: string;
  mobile: string;
  mobile_verified_at: number | null;
}

export interface BookingRequest {
  listing_id: string;
}

export interface BookingResponse {
  booking_id: string;
}

export interface BookingSummary {
  id: string;
  listing_id: string;
  status: BookingStatus;
  created_at: number;
  listing: Pick<ListingSummary, "title" | "type" | "location_text" | "cover_photo_url">;
}

// ─── Vendor shapes ───────────────────────────────────────────────────────────

export interface VendorRegisterRequest {
  vendor_type: VendorType;
  company_name?: string;
  licence_no?: string;
}

export interface VendorRegisterResponse {
  vendor_id: string;
  status: VendorStatus;
}

export interface VendorDocumentRequest {
  label: string;
  r2_key: string;
}

export interface VendorDocumentResponse {
  document_id: string;
}

export interface VendorProfile {
  id: string;
  user_id: string;
  vendor_type: VendorType;
  status: VendorStatus;
  company_name: string | null;
  licence_no: string | null;
  admin_note: string | null;
  documents: Array<{ id: string; label: string; url: string }>;
  created_at: number;
}

// ─── Upload shapes ───────────────────────────────────────────────────────────

export interface PresignRequest {
  filename: string;
  content_type: string;
  context: "listing_photo" | "vendor_doc";
}

export interface PresignResponse {
  key: string;
  upload_url: string;
}

// ─── Admin shapes ────────────────────────────────────────────────────────────

export interface AdminVendor {
  id: string;
  user_id: string;
  name: string;
  mobile: string;
  vendor_type: VendorType;
  status: VendorStatus;
  company_name: string | null;
  licence_no: string | null;
  admin_note: string | null;
  created_at: number;
  documents: Array<{ id: string; label: string; url: string }>;
}

export interface AdminListing {
  id: string;
  vendor_id: string;
  vendor_name: string;
  type: ListingType;
  title: string;
  status: ListingStatus;
  price: number;
  currency: string;
  location_text: string;
  admin_note: string | null;
  created_at: number;
}

export interface AdminBooking {
  id: string;
  status: BookingStatus;
  admin_note: string | null;
  created_at: number;
  updated_at: number;
  customer: { id: string; name: string; mobile: string };
  listing: {
    id: string;
    title: string;
    type: ListingType;
    location_text: string;
  };
  vendor: { id: string; name: string; mobile: string };
}

export interface AdminReportsResponse {
  listings: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    by_type: Record<ListingType, number>;
  };
  vendors: { total: number; approved: number; pending: number; rejected: number };
  customers: { total: number; verified: number };
  bookings: { total: number; closed: number; pending: number };
}

export interface AdminNotification {
  id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  read_at: number | null;
  created_at: number;
}

export interface AdminNotificationsResponse {
  count: number;
  items: AdminNotification[];
}

// ─── Corporate content (site_content) and public agents ─────────────────────

export * from "./content";

// ─── Availability journey (enquiries, requirements, matches) ────────────────

export * from "./availability";
