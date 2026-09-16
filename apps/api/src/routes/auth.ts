import { Hono } from "hono";
import type { Bindings, Variables } from "../types";
import { generateOtp, hashOtp, verifyOtp } from "../lib/otp";
import { signJwt } from "../lib/jwt";
import { sendOtpSms, isFallbackMode, FALLBACK_OTP } from "../agents/otp";

const E164_RE = /^\+[1-9]\d{7,14}$/;
const OTP_TTL_MS = 5 * 60 * 1000;
const JWT_TTL_CUSTOMER_VENDOR = 24 * 60 * 60;
const JWT_TTL_ADMIN = 8 * 60 * 60;

export const authRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

authRoutes.post("/otp/send", async (c) => {
  const body = await c.req.json<{ mobile?: string }>();
  const { mobile } = body;
  if (!mobile || !E164_RE.test(mobile)) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid E.164 mobile number" } }, 422);
  }

  const locked = await c.env.KV.get(`otp:lock:${mobile}`);
  if (locked) {
    return c.json({ error: { code: "RATE_LIMITED", message: "Account temporarily locked" } }, 429);
  }

  const rateRaw = await c.env.KV.get(`otp:rate:${mobile}`);
  const resendCount = rateRaw ? parseInt(rateRaw, 10) : 0;
  if (resendCount >= 3) {
    return c.json({ error: { code: "RATE_LIMITED", message: "Too many OTP requests" } }, 429);
  }

  c.executionCtx.waitUntil(
    (async () => {
      const newCount = resendCount + 1;
      await c.env.KV.put(`otp:rate:${mobile}`, String(newCount), { expirationTtl: 600 });

      const otp = isFallbackMode(c.env) ? FALLBACK_OTP : generateOtp();
      const codeHash = await hashOtp(otp, c.env.JWT_SECRET);
      const now = Date.now();
      const expiresAt = now + OTP_TTL_MS;

      await c.env.DB.prepare(
        "UPDATE otp_tokens SET used_at = ? WHERE mobile = ? AND used_at IS NULL"
      )
        .bind(now, mobile)
        .run();

      await c.env.DB.prepare(
        "INSERT INTO otp_tokens (id, mobile, code_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)"
      )
        .bind(crypto.randomUUID(), mobile, codeHash, expiresAt, now)
        .run();

      await sendOtpSms(mobile, otp, c.env);
    })()
  );

  return c.json({ expires_in: 300 });
});

authRoutes.post("/otp/verify", async (c) => {
  const body = await c.req.json<{ mobile?: string; otp?: string; code?: string; intent?: string }>();
  const { mobile, intent } = body;
  const code = body.otp ?? body.code;

  if (!mobile || !E164_RE.test(mobile)) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid mobile number" } }, 422);
  }
  if (!code || !/^\d{6}$/.test(code)) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "OTP must be 6 digits" } }, 422);
  }

  const tokenRow = await c.env.DB.prepare(
    "SELECT * FROM otp_tokens WHERE mobile = ? AND used_at IS NULL ORDER BY created_at DESC LIMIT 1"
  )
    .bind(mobile)
    .first<{
      id: string;
      code_hash: string;
      expires_at: number;
      attempts: number;
      used_at: number | null;
    }>();

  if (!tokenRow) {
    return c.json({ error: { code: "INVALID_CODE", message: "No active OTP" } }, 400);
  }

  const now = Date.now();
  if (tokenRow.expires_at < now) {
    return c.json({ error: { code: "EXPIRED", message: "OTP has expired" } }, 400);
  }
  if (tokenRow.attempts >= 5) {
    return c.json({ error: { code: "LOCKED", message: "Too many failed attempts" } }, 423);
  }

  const valid = await verifyOtp(code, tokenRow.code_hash, c.env.JWT_SECRET);
  if (!valid) {
    const newAttempts = tokenRow.attempts + 1;
    await c.env.DB.prepare("UPDATE otp_tokens SET attempts = ? WHERE id = ?")
      .bind(newAttempts, tokenRow.id)
      .run();
    if (newAttempts >= 5) {
      await c.env.KV.put(`otp:lock:${mobile}`, "1", { expirationTtl: 900 });
    }
    return c.json({ error: { code: "INVALID_CODE", message: "Incorrect OTP" } }, 400);
  }

  await c.env.DB.prepare("UPDATE otp_tokens SET used_at = ? WHERE id = ?")
    .bind(now, tokenRow.id)
    .run();

  const role = intent === "vendor" ? "vendor" : "customer";

  let user = await c.env.DB.prepare("SELECT id, role FROM users WHERE mobile = ?")
    .bind(mobile)
    .first<{ id: string; role: string }>();

  if (!user) {
    const newId = crypto.randomUUID();
    await c.env.DB.prepare(
      "INSERT INTO users (id, name, mobile, mobile_verified_at, role, last_login_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(newId, "", mobile, now, role, now, now, now)
      .run();
    user = { id: newId, role };
  } else {
    await c.env.DB.prepare("UPDATE users SET last_login_at = ?, mobile_verified_at = COALESCE(mobile_verified_at, ?), updated_at = ? WHERE id = ?")
      .bind(now, now, now, user.id)
      .run();
  }

  const ttl = user.role === "admin" ? JWT_TTL_ADMIN : JWT_TTL_CUSTOMER_VENDOR;
  const token = await signJwt(
    { sub: user.id, role: user.role as import("@momentum/shared").Role, mobile_verified: true, exp: Math.floor(now / 1000) + ttl },
    c.env.JWT_SECRET
  );

  return c.json({ token, user: { id: user.id, role: user.role, mobile_verified: true } });
});

authRoutes.post("/signout", (c) => c.json({ ok: true }));
