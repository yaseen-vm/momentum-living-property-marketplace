import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { OtpForm } from "../../components/OtpForm";
import { useAuthStore } from "../../store/auth";
import { api } from "../../lib/api";
import type { Role } from "@momentum/shared";

interface OtpLoginPageProps {
  role: "customer" | "vendor";
}

const PANELS = {
  customer: {
    image: "/images/office_buildings_modern_1789645950789.jpg",
    eyebrow: "Find Commercial Property",
    heading: "Submit your requirement, we find the right fit.",
    bullets: [
      "Labour accommodation, warehouses & land",
      "Verified mobile — OTP in seconds",
      "Top 3 matched options delivered to you",
    ],
    formHeading: "Find a Property",
    formSub: "Enter your mobile number to get started. We'll send a quick OTP.",
    switchText: "Are you a property owner?",
    switchLabel: "List your property",
    switchTo: "/vendor/login",
  },
  vendor: {
    image: "/images/construction_buildings_sunset_1789645890123.jpg",
    eyebrow: "List Your Property",
    heading: "Register your availability and reach qualified tenants.",
    bullets: [
      "Labour camps, warehouses & commercial land",
      "Your listing reviewed by our brokerage team",
      "Connected with verified, qualified requirements",
    ],
    formHeading: "List Your Property",
    formSub: "Enter your mobile number to register as a landlord or property owner.",
    switchText: "Looking for a property instead?",
    switchLabel: "Submit a requirement",
    switchTo: "/login",
  },
};

export default function OtpLoginPage({ role }: OtpLoginPageProps) {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const panel = PANELS[role];

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

    navigate("/availability");
  }

  return (
    <div className="flex min-h-screen font-sans bg-white">

      {/* Left — hero panel */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden">
        <img
          src={panel.image}
          alt="Commercial Property"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark gradient from bottom-left */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f2133]/90 via-[#1D3B53]/70 to-transparent" />

        <div className="relative z-10 flex flex-col h-full p-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-1 text-white">
            <span className="text-xl font-bold italic font-serif">
              Momentum<span className="font-sans font-semibold not-italic">Living</span>
            </span>
          </Link>

          {/* Main copy — vertically centered */}
          <div className="flex-1 flex flex-col justify-center max-w-md">
            <span className="text-xs tracking-[0.2em] text-white/60 uppercase font-medium mb-5">
              {panel.eyebrow}
            </span>
            <h2 className="text-4xl lg:text-5xl font-serif text-white leading-[1.15] mb-8">
              {panel.heading}
            </h2>
            <ul className="space-y-4">
              {panel.bullets.map((b) => (
                <li key={b} className="flex items-start gap-3 text-white/80 text-sm leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 text-white/50 mt-0.5 flex-shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom — licence badge */}
          <div className="text-xs text-white/40 leading-relaxed">
            Momentum Living Real Estate L.L.C &nbsp;·&nbsp; Licence No. 1606417 &nbsp;·&nbsp; Dubai DET
          </div>
        </div>
      </div>

      {/* Right — form panel */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
          {/* Mobile logo */}
          <Link to="/" className="lg:hidden text-xl font-bold italic font-serif text-slate-900">
            Momentum<span className="font-sans font-semibold not-italic">Living</span>
          </Link>
          <div className="hidden lg:block" />

          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center px-6 sm:px-12 py-12">
          <div className="w-full max-w-sm">

            {/* Role toggle pill */}
            <div className="inline-flex bg-slate-100 rounded-full p-1 mb-8">
              <Link
                to="/login"
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  role === "customer"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Find Property
              </Link>
              <Link
                to="/vendor/login"
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  role === "vendor"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                List Property
              </Link>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              {panel.formHeading}
            </h1>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
              {panel.formSub}
            </p>

            <OtpForm
              onSuccess={handleSuccess}
              intent={role}
              title=""
              subtitle=""
            />

            <p className="mt-8 text-center text-xs text-slate-400 leading-relaxed">
              {panel.switchText}{" "}
              <Link to={panel.switchTo} className="text-slate-700 font-medium hover:underline">
                {panel.switchLabel}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
