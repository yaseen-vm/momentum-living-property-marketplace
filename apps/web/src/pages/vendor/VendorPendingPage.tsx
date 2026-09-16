import { Clock } from "lucide-react";
import { useAuthStore } from "../../store/auth";
import { Button } from "../../components/ui/Button";

export default function VendorPendingPage() {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-4 text-2xl font-bold italic font-serif text-[#1D3B53]">
          Momentum<span className="font-sans font-semibold not-italic">Living</span>
        </div>
        <div className="rounded-2xl bg-white p-10 shadow-xl border border-slate-100">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="mb-2 text-2xl font-serif font-bold text-slate-900">Your Account is Being Reviewed</h1>
          <p className="mb-6 text-slate-500 leading-relaxed">
            Thank you for submitting your details. Our team will carefully review your documents and notify you once your account is approved. This typically takes 1–2 business days.
          </p>
          <div className="mb-6 rounded-xl bg-slate-50 px-5 py-4 text-left text-sm text-slate-600 border border-slate-200">
            <strong className="text-slate-800">What happens next?</strong>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#1D3B53]/10 text-xs font-bold text-[#1D3B53]">1</span>
                Our admin team reviews your submitted documents
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#1D3B53]/10 text-xs font-bold text-[#1D3B53]">2</span>
                You'll receive an SMS and email once approved
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#1D3B53]/10 text-xs font-bold text-[#1D3B53]">3</span>
                Your owner dashboard unlocks to create and manage listings
              </li>
            </ul>
          </div>
          <Button variant="secondary" className="w-full" onClick={clearAuth}>
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
