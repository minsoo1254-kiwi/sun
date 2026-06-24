import { NextResponse } from "next/server";
import { searchCases } from "@/lib/law-api";
import { LawApiError } from "@/types/case";
import type { CaseSearchRange } from "@/types/case";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateRange = parseDateRange(searchParams.get("dateRange"));

  try {
    const result = await searchCases({
      query: searchParams.get("query") ?? "",
      search: normalizeSearchRange(searchParams.get("search")),
      court: searchParams.get("court") ?? "",
      startDate: searchParams.get("startDate") ?? searchParams.get("from") ?? dateRange.startDate,
      endDate: searchParams.get("endDate") ?? searchParams.get("to") ?? dateRange.endDate,
      page: Number(searchParams.get("page") ?? "1")
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

function normalizeSearchRange(value: string | null): CaseSearchRange {
  return value === "1" ? "1" : "2";
}

function parseDateRange(value: string | null) {
  if (!value) {
    return { startDate: "", endDate: "" };
  }

  const [startDate = "", endDate = ""] = value.split(/[~,|]/).map((part) => part.trim());
  return { startDate, endDate };
}

function handleRouteError(error: unknown) {
  if (error instanceof LawApiError) {
    return NextResponse.json({ message: error.message, code: error.code }, { status: error.status });
  }

  return NextResponse.json(
    { message: "판례 API 호출 중 오류가 발생했습니다.", code: "LAW_API_ERROR" },
    { status: 500 }
  );
}
