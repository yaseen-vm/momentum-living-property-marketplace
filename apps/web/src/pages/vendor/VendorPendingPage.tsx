import { Clock, Building2 } from "lucide-react";
import { useAuthStore } from "../../store/auth";
import { Button } from "../../components/ui/Button";

export default function VendorPendingPage() {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-primary-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <Building2 className="h-12 w-12 text-primary-600" />
        </div>
        <div className="rounded-2xl bg-white p-10 shadow-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-slate-900">Account Under Review</h1>
          <p className="mb-6 text-slate-500">
            Thank you for submitting your details. Our team will verify your documents and notify you
            once your account is approved. This usually takes 1–2 business days.
          </p>
          <div className="mb-6 rounded-lg bg-yellow-50 px-4 py-3 text-left text-sm text-yellow-800">
            <strong>What happens next?</strong>
            <ul className="mt-2 list-disc pl-4 space-y-1">
              <li>Admin reviews your submitted documents</li>
              <li>You receive an SMS and email once approved</li>
              <li>Your dashboard unlocks to create listings</li>
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
