import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";

import Landing from "./pages/Landing";
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
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<OtpLoginPage role="customer" />} />
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
