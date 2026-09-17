import { useNavigate, Link } from "react-router-dom";
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
    <div className="flex min-h-screen font-sans bg-white">
      {/* Left Column (Hero Image) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900">
        <img
          src="/images/login_hero.jpg"
          alt="Luxury Property"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20"></div>
        
        <div className="absolute top-10 left-12 flex items-center gap-3 text-white z-10">
          <div className="bg-white p-2.5 rounded-full flex items-center justify-center">
            <Building2 className="h-6 w-6 text-slate-900" />
          </div>
          <span className="text-2xl font-semibold">Momentum Living</span>
        </div>

        <div className="relative z-10 flex flex-col justify-end p-16 w-full text-white pb-24">
          <span className="text-xs tracking-[0.2em] text-white/80 mb-6 uppercase font-medium">
            Your Premier Property Marketplace
          </span>
          <h2 className="text-5xl lg:text-6xl font-serif leading-[1.1] mb-6">
            Discover Verified <br />
            <span className="italic font-light">Properties &</span> <br />
            Modern Spaces
          </h2>
          <p className="text-base text-white/90 max-w-md leading-relaxed font-light">
            Renowned for meticulous verification and masterful service, our real estate marketplace stands apart in delivering quality and peace of mind.
          </p>
          <div className="flex gap-2 mt-12">
            <div className="w-8 h-1.5 bg-white rounded-full"></div>
            <div className="w-1.5 h-1.5 bg-white/50 rounded-full"></div>
            <div className="w-1.5 h-1.5 bg-white/50 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Right Column (Form) */}
      <div className="flex-1 flex flex-col justify-center items-center px-4 sm:px-12 bg-white relative">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-10 flex items-center gap-3 justify-center">
            <div className="bg-slate-900 p-2.5 rounded-full flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-semibold text-slate-900">Momentum Living</span>
          </div>
          
          <div className="mb-8 text-center lg:text-left">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Welcome Back to Momentum Living!
            </h1>
            <p className="text-slate-500">
              {isVendor ? "Sign in to manage your properties" : "Sign in to your account"}
            </p>
          </div>

          <div className="bg-white">
            <OtpForm
              onSuccess={handleSuccess}
              intent={role}
              title=""
              subtitle=""
            />
          </div>

          <div className="mt-12">
            <p className="mt-8 text-center text-sm text-slate-500">
              {isVendor ? (
                <>
                  Looking for a property?{" "}
                  <Link to="/login" className="font-semibold text-primary-600 hover:underline">
                    Browse listings
                  </Link>
                </>
              ) : (
                <>
                  Want to list a property?{" "}
                  <Link to="/vendor/login" className="font-semibold text-primary-600 hover:underline">
                    Owner sign in
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
