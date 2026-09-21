import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";

import SiteLayout from "./components/site/SiteLayout";
import Landing from "./pages/Landing";
import AboutPage from "./pages/site/AboutPage";
import ManagingDirectorPage from "./pages/site/ManagingDirectorPage";
import MdNotePage from "./pages/site/MdNotePage";
import AgentsPage from "./pages/site/AgentsPage";
import WhyChooseUsPage from "./pages/site/WhyChooseUsPage";
import ContactPage from "./pages/site/ContactPage";
import LegalPage from "./pages/site/LegalPage";
import AvailabilityPage from "./pages/availability/AvailabilityPage";
import MatchesPage from "./pages/availability/MatchesPage";
import OpportunityDetailPage from "./pages/availability/OpportunityDetailPage";
import OtpLoginPage from "./pages/auth/OtpLoginPage";
import VendorRegisterPage from "./pages/vendor/VendorRegisterPage";
import VendorPendingPage from "./pages/vendor/VendorPendingPage";
import VendorDashboardPage from "./pages/vendor/VendorDashboardPage";
import VendorListingFormPage from "./pages/vendor/VendorListingFormPage";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminLeadsPage from "./pages/admin/AdminLeadsPage";
import AdminLeadDetailPage from "./pages/admin/AdminLeadDetailPage";
import AdminPropertiesPage from "./pages/admin/AdminPropertiesPage";
import AdminPropertyFormPage from "./pages/admin/AdminPropertyFormPage";
import AdminAgentsPage from "./pages/admin/AdminAgentsPage";
import AdminContentPage from "./pages/admin/AdminContentPage";
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

          {/* Availability journey: the only route into inventory (spec §1, §12). */}
          <Route path="/availability" element={<AvailabilityPage />} />
          <Route path="/availability/results/:enquiryId" element={<MatchesPage />} />
          <Route path="/availability/opportunities/:id" element={<OpportunityDetailPage />} />
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

        {/* Legacy customer browse: inventory is only reachable through Availability now. */}
        <Route path="/listings/*" element={<Navigate to="/availability" replace />} />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["admin"]} redirectTo="/login">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/leads" replace />} />
          <Route path="leads" element={<AdminLeadsPage />} />
          <Route path="leads/:id" element={<AdminLeadDetailPage />} />
          <Route path="properties" element={<AdminPropertiesPage />} />
          <Route path="properties/new" element={<AdminPropertyFormPage />} />
          <Route path="properties/:id" element={<AdminPropertyFormPage />} />
          <Route path="agents" element={<AdminAgentsPage />} />
          <Route path="content" element={<AdminContentPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="export" element={<AdminExportPage />} />
          {/* Retired vendor, listing-approval and booking queues */}
          <Route path="*" element={<Navigate to="/admin/leads" replace />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
