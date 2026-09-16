export interface Bindings {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  JWT_SECRET: string;
  MSG91_AUTH_KEY: string;
  MSG91_TEMPLATE_ID: string;
  RESEND_API_KEY: string;
  ADMIN_EMAIL: string;
  ENVIRONMENT: string;
}

export interface Variables {
  jwtPayload: import("@momentum/shared").JwtPayload;
}
