import "server-only";

import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-session";

export class AdminAuthError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status = 401) {
    super(message);
    this.name = "AdminAuthError";
    this.code = code;
    this.status = status;
  }
}

export function assertAdminAuthorized(request: Request) {
  if (!process.env.ADMIN_PASSWORD?.trim()) {
    throw new AdminAuthError("ADMIN_PASSWORD_MISSING", "ADMIN_PASSWORD가 설정되지 않았습니다.", 500);
  }

  if (!verifyAdminSessionToken(readCookie(request, ADMIN_SESSION_COOKIE))) {
    throw new AdminAuthError("UNAUTHORIZED", "관리자 인증이 필요합니다.", 401);
  }
}

function readCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const prefix = `${name}=`;
  const found = cookies.find((cookie) => cookie.startsWith(prefix));
  return found ? decodeURIComponent(found.slice(prefix.length)) : "";
}
