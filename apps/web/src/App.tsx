import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";

import SiteLayout from "./components/site/SiteLayout";
import Landing from "./pages/Landing";
import PagePending from "./pages/site/PagePending";
import AboutPage from "./pages/site/AboutPage";
import ManagingDirectorPage from "./pages/site/ManagingDirectorPage";
import MdNotePage from "./pages/site/MdNotePage";
import AgentsPage from "./pages/site/AgentsPage";
import WhyChooseUsPage from "./pages/site/WhyChooseUsPage";
import ContactPage from "./pages/site/ContactPage";
import LegalPage from "./pages/site/LegalPage";
import OtpLoginPage from "./pages/auth/OtpLoginPage";
import VendorRegisterPage from "./pages/vendor/VendorRegisterPage";
import VendorPendingPage from "./pages/vendor/VendorPendingPage";
import VendorDashboardPage from "./pages/vendor/VendorDashboardPage";
import VendorListingFormPage from "./pages/vendor/VendorListingFormPage";
import ListingBrowsePage from "./pages/customer/ListingBrowsePage";
import ListingDetailPage from "./pages/customer/ListingDetailPage";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminVendorsPage from "./pages/admin/AdminVendorsPage";
import AdminListingsPage from "./pages/admin/AdminListingsPage";
import AdminBookingsPage from "./pages/admin/AdminBookingsPage";
import AdminExportPage from "./pages/admin/AdminExportPage";
import AdminReportsPage from "./pages/admin/AdminReportsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public corporate site */}
        <Route element={<SiteLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/managing-director" element={<ManagingDirectorPage />} />
          <Route path="/managing-director/note" element={<MdNotePage />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/why-choose-us" element={<WhyChooseUsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<LegalPage page="privacy" />} />
          <Route path="/terms" element={<LegalPage page="terms" />} />
          {/* The Availability wizard replaces this holding page in Stage 3. */}
          <Route
            path="/availability"
            element={
              <PagePending
                title="Availability"
                description="Tell us what you need and we will match you with suitable opportunities."
              />
            }
          />
        </Route>

        {/* Sign-in (admin uses /login). Not linked from the corporate site. */}
        <Route path="/login" element={<OtpLoginPage role="customer" />} />

        {/* Legacy vendor login (hidden from navigation; removed after client confirmation) */}
        <Route path="/vendor/login" element={<OtpLoginPage role="vendor" />} />

        {/* Vendor */}
        <Route
          path="/vendor/register"
          element={
            <ProtectedRoute roles={["vendor"]} redirectTo="/vendor/login">
              <VendorRegisterPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor/pending"
          element={
            <ProtectedRoute roles={["vendor"]} redirectTo="/vendor/login">
              <VendorPendingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor/dashboard"
          element={
            <ProtectedRoute roles={["vendor"]} redirectTo="/vendor/login">
              <VendorDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor/listings/new"
          element={
            <ProtectedRoute roles={["vendor"]} redirectTo="/vendor/login">
              <VendorListingFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor/listings/:id/edit"
          element={
            <ProtectedRoute roles={["vendor"]} redirectTo="/vendor/login">
              <VendorListingFormPage />
            </ProtectedRoute>
          }
        />

        {/* Customer */}
        <Route
          path="/listings"
          element={
            <ProtectedRoute roles={["customer"]} redirectTo="/login">
              <ListingBrowsePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/listings/:id"
          element={
            <ProtectedRoute roles={["customer"]} redirectTo="/login">
              <ListingDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["admin"]} redirectTo="/login">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/vendors" replace />} />
          <Route path="vendors" element={<AdminVendorsPage />} />
          <Route path="listings" element={<AdminListingsPage />} />
          <Route path="bookings" element={<AdminBookingsPage />} />
          <Route path="export" element={<AdminExportPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
