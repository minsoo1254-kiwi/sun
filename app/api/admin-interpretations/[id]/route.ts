import { NextResponse } from "next/server";
import { assertAdminAuthorized } from "@/lib/admin-auth";
import { apiErrorResponse } from "@/lib/api-error-response";
import {
  deleteAdminInterpretation,
  getAdminInterpretation,
  updateAdminInterpretation
} from "@/lib/admin-interpretations-store";
import { assertSameOrigin, parsePositiveId } from "@/lib/security";
import type { AdminInterpretationInput } from "@/types/admin-interpretation";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    assertAdminAuthorized(request);
    const { id } = await context.params;
    const item = await getAdminInterpretation(parsePositiveId(id));
    return NextResponse.json({ item });
  } catch (error) {
    return apiErrorResponse(error, "행정해석 조회에 실패했습니다.");
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    assertSameOrigin(request);
    assertAdminAuthorized(request);
    const { id } = await context.params;
    const payload = (await request.json()) as AdminInterpretationInput;
    const item = await updateAdminInterpretation(parsePositiveId(id), payload);
    return NextResponse.json({ item });
  } catch (error) {
    return apiErrorResponse(error, "행정해석 수정에 실패했습니다.");
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertSameOrigin(request);
    assertAdminAuthorized(request);
    const { id } = await context.params;
    await deleteAdminInterpretation(parsePositiveId(id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "행정해석 삭제에 실패했습니다.");
  }
}
