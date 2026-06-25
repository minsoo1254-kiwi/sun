import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "hr_admin_session";
const SESSION_MAX_AGE_SECONDS = 30 * 60;

type AdminSessionPayload = {
  exp: number;
  nonce: string;
  role: "admin";
};

export function verifyAdminPassword(password: string) {
  const configured = process.env.ADMIN_PASSWORD?.trim();

  if (!configured) {
    return false;
  }

  return timingSafeEqualText(password, configured);
}

export function createAdminSessionToken() {
  const payload: AdminSessionPayload = {
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
    nonce: randomBytes(16).toString("hex"),
    role: "admin"
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAdminSessionToken(token: string | undefined | null) {
  if (!token) {
    return false;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature || !timingSafeEqualText(signature, sign(encodedPayload))) {
    return false;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as AdminSessionPayload;
    return payload.role === "admin" && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function getAdminSessionMaxAge() {
  return SESSION_MAX_AGE_SECONDS;
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim() || process.env.SESSION_SECRET?.trim() || process.env.ADMIN_PASSWORD?.trim();

  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET or ADMIN_PASSWORD is required");
  }

  return secret;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function timingSafeEqualText(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}
