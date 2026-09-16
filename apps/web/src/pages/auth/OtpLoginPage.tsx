import { useNavigate } from "react-router-dom";
import { Building2 } from "lucide-react";
import { OtpForm } from "../../components/OtpForm";
import { useAuthStore } from "../../store/auth";
import { api } from "../../lib/api";
import type { Role } from "@momentum/shared";

interface OtpLoginPageProps {
  role: "customer" | "vendor";
}

export default function OtpLoginPage({ role }: OtpLoginPageProps) {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  async function handleSuccess(token: string, returnedRole: string, userId: string) {
    setAuth(token, returnedRole as Role, userId);

    if (returnedRole === "admin") {
      navigate("/admin/vendors");
      return;
    }

    if (role === "vendor" || returnedRole === "vendor") {
      try {
        const profile = await api.vendor.getProfile(token);
        if (profile.status === "approved") {
          navigate("/vendor/dashboard");
        } else if (profile.status === "pending") {
          navigate("/vendor/pending");
        } else {
          navigate("/vendor/register");
        }
      } catch {
        navigate("/vendor/register");
      }
      return;
    }

    navigate("/listings");
  }

  const isVendor = role === "vendor";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-primary-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary-600" />
            <span className="text-xl font-bold text-slate-900">Momentum Living</span>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <OtpForm
            onSuccess={handleSuccess}
            intent={role}
            title={isVendor ? "Owner Sign In" : "Browse Properties"}
            subtitle={
              isVendor
                ? "Enter your mobile number to list your property"
                : "Enter your mobile number to browse listings"
            }
          />
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">
          {isVendor ? (
            <>
              Looking for a property?{" "}
              <a href="/login" className="text-primary-600 hover:underline">
                Browse listings
              </a>
            </>
          ) : (
            <>
              Want to list a property?{" "}
              <a href="/vendor/login" className="text-primary-600 hover:underline">
                Owner sign in
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
