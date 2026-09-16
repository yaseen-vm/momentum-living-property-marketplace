import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../lib/api";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

const mobileSchema = z.object({
  mobile: z
    .string()
    .min(7)
    .regex(/^\+?[1-9]\d{6,14}$/, "Enter a valid mobile number with country code (e.g. +971501234567)"),
});

const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits").regex(/^\d+$/, "OTP must be numeric"),
});

type MobileForm = z.infer<typeof mobileSchema>;
type OtpFormData = z.infer<typeof otpSchema>;

interface OtpFormProps {
  onSuccess: (token: string, role: string, userId: string) => void;
  title?: string;
  subtitle?: string;
  intent?: "vendor" | "customer";
}

export function OtpForm({ onSuccess, title = "Verify your number", subtitle, intent }: OtpFormProps) {
  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const mobileForm = useForm<MobileForm>({ resolver: zodResolver(mobileSchema) });
  const otpForm = useForm<OtpFormData>({ resolver: zodResolver(otpSchema) });

  async function handleSendOtp(data: MobileForm) {
    setError(null);
    try {
      await api.auth.sendOtp(data.mobile);
      setMobile(data.mobile);
      setStep("otp");
      startCooldown();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send OTP");
    }
  }

  async function handleVerifyOtp(data: OtpFormData) {
    setError(null);
    try {
      const res = await api.auth.verifyOtp(mobile, data.otp, intent);
      onSuccess(res.token, res.user.role, res.user.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid OTP");
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setError(null);
    try {
      await api.auth.sendOtp(mobile);
      startCooldown();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to resend OTP");
    }
  }

  function startCooldown() {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      {title && (
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
      )}

      {step === "mobile" ? (
        <form onSubmit={mobileForm.handleSubmit(handleSendOtp)} className="space-y-4">
          <Input
            label="Mobile Number"
            placeholder="+971501234567"
            type="tel"
            {...mobileForm.register("mobile")}
            error={mobileForm.formState.errors.mobile?.message}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            type="submit"
            className="w-full"
            loading={mobileForm.formState.isSubmitting}
          >
            Send OTP
          </Button>
        </form>
      ) : (
        <form onSubmit={otpForm.handleSubmit(handleVerifyOtp)} className="space-y-4">
          <p className="text-sm text-slate-600">
            We sent a 6-digit code to <strong>{mobile}</strong>.
          </p>
          <Input
            label="OTP Code"
            placeholder="123456"
            type="text"
            inputMode="numeric"
            maxLength={6}
            autoFocus
            {...otpForm.register("otp")}
            error={otpForm.formState.errors.otp?.message}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            type="submit"
            className="w-full"
            loading={otpForm.formState.isSubmitting}
          >
            Verify OTP
          </Button>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              className="text-slate-500 hover:text-slate-700"
              onClick={() => setStep("mobile")}
            >
              Change number
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="text-primary-600 hover:text-primary-700 disabled:text-slate-400"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
