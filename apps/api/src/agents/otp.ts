import type { Bindings } from "../types";

export async function sendOtpSms(
  mobile: string,
  otp: string,
  env: Bindings
): Promise<void> {
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
