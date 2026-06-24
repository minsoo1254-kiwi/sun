import { NextResponse } from "next/server";
import { getCaseDetail } from "@/lib/law-api";
import { LawApiError } from "@/types/case";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const { searchParams } = new URL(request.url);
    const result = await getCaseDetail(params.id, searchParams.get("lm") ?? searchParams.get("LM") ?? "");
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof LawApiError) {
      return NextResponse.json({ message: error.message, code: error.code }, { status: error.status });
    }

    return NextResponse.json(
      { message: "판례 API 호출 중 오류가 발생했습니다.", code: "LAW_API_ERROR" },
      { status: 500 }
    );
  }
}
