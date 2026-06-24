import { NextResponse } from "next/server";
import { assertAdminAuthorized } from "@/lib/admin-auth";
import { apiErrorResponse } from "@/lib/api-error-response";

export async function GET(request: Request) {
  try {
    assertAdminAuthorized(request);
    return NextResponse.json({ authenticated: true });
  } catch (error) {
    return apiErrorResponse(error, "관리자 인증 확인에 실패했습니다.");
  }
}
