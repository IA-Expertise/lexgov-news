import { createHmac } from "crypto";

const TOKEN_SALT = "lexgov-admin-session-v1";

export function getAdminSessionToken(secret: string): string {
  return createHmac("sha256", secret).update(TOKEN_SALT).digest("hex");
}

export function isAdminSessionValid(
  secret: string | undefined,
  cookieValue: string | undefined
): boolean {
  if (!secret?.trim() || !cookieValue) return false;
  try {
    return getAdminSessionToken(secret) === cookieValue;
  } catch {
    return false;
  }
}
