import { NextResponse } from "next/server";
import { assertAdminAuthorized } from "@/lib/admin-auth";
import { apiErrorResponse } from "@/lib/api-error-response";
import {
  createAdminInterpretation,
  listAdminInterpretations
} from "@/lib/admin-interpretations-store";
import { assertSameOrigin } from "@/lib/security";
import type { AdminInterpretationInput } from "@/types/admin-interpretation";

export async function GET(request: Request) {
  try {
    assertAdminAuthorized(request);
    const items = await listAdminInterpretations();
    return NextResponse.json({ items });
  } catch (error) {
    return apiErrorResponse(error, "행정해석 목록 조회에 실패했습니다.");
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    assertAdminAuthorized(request);
    const payload = (await request.json()) as AdminInterpretationInput;
    const item = await createAdminInterpretation(payload);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "행정해석 등록에 실패했습니다.");
  }
}
