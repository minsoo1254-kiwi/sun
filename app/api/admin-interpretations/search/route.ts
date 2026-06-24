import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error-response";
import { searchAdminInterpretations } from "@/lib/admin-interpretations-store";
import { assertRateLimit, getClientIp } from "@/lib/rate-limit";
import { normalizeKeyword } from "@/lib/security";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    assertRateLimit(`admin-search:${getClientIp(request)}`, 60, 60 * 1000);
    const keyword = normalizeKeyword(searchParams.get("keyword") ?? searchParams.get("query") ?? "");
    const items = await searchAdminInterpretations(keyword);
    return NextResponse.json({ keyword, items });
  } catch (error) {
    return apiErrorResponse(error, "행정해석 검색에 실패했습니다.");
  }
}
