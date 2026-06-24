import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, createAdminSessionToken, getAdminSessionMaxAge, verifyAdminPassword } from "@/lib/admin-session";
import { apiErrorResponse } from "@/lib/api-error-response";
import { assertRateLimit, getClientIp } from "@/lib/rate-limit";
import { assertSameOrigin, SecurityValidationError } from "@/lib/security";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    assertRateLimit(`admin-login:${getClientIp(request)}`, 5, 15 * 60 * 1000);

    const payload = (await request.json()) as { password?: string };

    if (!verifyAdminPassword(String(payload.password ?? ""))) {
      throw new SecurityValidationError("INVALID_CREDENTIALS", "관리자 인증에 실패했습니다.", 401);
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(), {
      httpOnly: true,
      maxAge: getAdminSessionMaxAge(),
      path: "/",
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production"
    });

    return response;
  } catch (error) {
    return apiErrorResponse(error, "관리자 로그인에 실패했습니다.");
  }
}
