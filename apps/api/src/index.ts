import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Bindings, Variables } from "./types";
import { authRoutes } from "./routes/auth";
import { listingRoutes } from "./routes/listings";
import { contentRoutes } from "./routes/content";
import { agentRoutes } from "./routes/agents";
import { availabilityRoutes } from "./routes/availability";
import { vendorProfileRoutes } from "./routes/vendor/profile";
import { vendorListingRoutes } from "./routes/vendor/listings";
import { customerProfileRoutes } from "./routes/customer/profile";
import { customerBookingRoutes } from "./routes/customer/bookings";
import { customerShortlistRoutes } from "./routes/customer/shortlists";
import { adminVendorRoutes } from "./routes/admin/vendors";
import { adminListingRoutes } from "./routes/admin/listings";
import { adminBookingRoutes } from "./routes/admin/bookings";
import { adminExportRoutes } from "./routes/admin/export";
import { adminReportRoutes } from "./routes/admin/reports";
import { adminNotificationRoutes } from "./routes/admin/notifications";
import { uploadRoutes } from "./routes/upload";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      if (c.env.ENVIRONMENT === "development") return origin;
      const allowed = ["https://momentum-living-web.pages.dev", "https://momentum-living.com"];
      return allowed.includes(origin ?? "") ? origin : null;
    },
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  })
);

app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/auth", authRoutes);
app.route("/listings", listingRoutes);

app.route("/content", contentRoutes);
app.route("/agents", agentRoutes);

app.route("/availability", availabilityRoutes);

app.route("/vendor", vendorProfileRoutes);
app.route("/vendor/listings", vendorListingRoutes);

app.route("/customer", customerProfileRoutes);
app.route("/customer/bookings", customerBookingRoutes);
app.route("/customer/shortlist", customerShortlistRoutes);

app.route("/admin/vendors", adminVendorRoutes);
app.route("/admin/listings", adminListingRoutes);
app.route("/admin/bookings", adminBookingRoutes);
app.route("/admin/export", adminExportRoutes);
app.route("/admin/reports", adminReportRoutes);
app.route("/admin/notifications", adminNotificationRoutes);

app.route("/upload", uploadRoutes);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } }, 500);
});

app.notFound((c) =>
  c.json({ error: { code: "NOT_FOUND", message: "Route not found" } }, 404)
);

export default app;
