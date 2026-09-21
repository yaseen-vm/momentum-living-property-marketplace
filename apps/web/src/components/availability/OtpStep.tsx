import { useEffect, useState } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import type { Role } from "@momentum/shared";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/auth";
import { inputClass } from "./Field";

interface OtpStepProps {
  mobile: string;
  onChangeNumber: () => void;
  /** Called once the mobile is verified and the enquirer token is stored. */
  onVerified: (token: string) => void;
}

/** Mobile OTP verification between Step 2 and Step 3 (spec §15). The code is never shown here. */
export function OtpStep({ mobile, onChangeNumber, onVerified }: OtpStepProps) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.auth.sendOtp(mobile);
      setSent(true);
      setCode("");
      setCooldown(res.resend_after ?? 60);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We could not send the code. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from the SMS.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api.auth.verifyOtp(mobile, code);
      if (res.user.role !== "customer") {
        setError("This number is registered to a staff account. Please use a different mobile number.");
        return;
      }
      setAuth(res.token, res.user.role as Role, res.user.id);
      onVerified(res.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That code did not work. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-navy-50 text-navy-800">
        <ShieldCheck className="h-7 w-7" aria-hidden />
      </span>
      <h2 className="heading-2 mt-6">Verify your mobile</h2>
      <p className="lead mt-3">
        {sent ? "We sent a 6-digit code to" : "We will send a 6-digit code by SMS to"}{" "}
        <strong className="whitespace-nowrap text-navy-900">{mobile}</strong>
      </p>

      {!sent ? (
        <button type="button" onClick={send} disabled={busy} className="btn-primary mt-8 w-full">
          {busy ? "Sending…" : "Send code"}
        </button>
      ) : (
        <form onSubmit={verify} noValidate className="mt-8">
          <label htmlFor="otp-code" className="sr-only">
            6-digit code
          </label>
          <input
            id="otp-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            placeholder="••••••"
            className={`${inputClass(error)} text-center font-mono text-2xl tracking-[0.5em]`}
          />
          <button type="submit" disabled={busy || code.length !== 6} className="btn-primary mt-4 w-full">
            {busy ? "Verifying…" : "Verify and continue"}
          </button>
          <p className="mt-4 text-sm text-charcoal-500">
            Didn&apos;t receive it?{" "}
            <button
              type="button"
              onClick={send}
              disabled={cooldown > 0 || busy}
              className="font-medium text-navy-800 underline underline-offset-2 disabled:text-charcoal-400 disabled:no-underline"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </p>
        </form>
      )}

      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onChangeNumber}
        className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-charcoal-500 hover:text-navy-800"
      >
        <ArrowLeft className="h-4 w-4" /> Change number or details
      </button>
    </div>
  );
}
