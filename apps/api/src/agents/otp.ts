import type { Bindings } from "../types";

function isPlaceholder(val: string) {
  return !val || val.startsWith("placeholder") || val.startsWith("re_placeholder");
}

export const FALLBACK_OTP = "123456";

/** SMS provider configured. Without it, OTP only works in local development. */
export function isSmsConfigured(env: Bindings): boolean {
  return !isPlaceholder(env.MSG91_AUTH_KEY);
}

/** Fixed development code: only ever when ENVIRONMENT=development and MSG91 is not configured. */
export function isFallbackMode(env: Bindings): boolean {
  return env.ENVIRONMENT === "development" && !isSmsConfigured(env);
}

export async function sendOtpSms(
  mobile: string,
  otp: string,
  env: Bindings
): Promise<void> {
  if (isFallbackMode(env)) {
    console.log(`[FALLBACK] OTP for ${mobile}: ${FALLBACK_OTP}`);
    return;
  }
  const res = await fetch("https://api.msg91.com/api/v5/otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authkey: env.MSG91_AUTH_KEY,
    },
    body: JSON.stringify({
      template_id: env.MSG91_TEMPLATE_ID,
      mobile: mobile.replace(/^\+/, ""),
      otp,
    }),
  });
  if (!res.ok) {
    throw new Error(`MSG91 error: ${res.status} ${await res.text()}`);
  }
}
