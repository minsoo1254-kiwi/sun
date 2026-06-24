import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error-response";
import { searchCases } from "@/lib/law-api";
import type { CaseSearchRange } from "@/types/case";
import { assertRateLimit, getClientIp } from "@/lib/rate-limit";
import { normalizeKeyword, parsePage } from "@/lib/security";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateRange = parseDateRange(searchParams.get("dateRange"));

  try {
    assertRateLimit(`case-search:${getClientIp(request)}`, 60, 60 * 1000);
    const query = normalizeKeyword(searchParams.get("query") ?? "");
    const result = await searchCases({
      query,
      search: normalizeSearchRange(searchParams.get("search")),
      court: searchParams.get("court") ?? "",
      startDate: searchParams.get("startDate") ?? searchParams.get("from") ?? dateRange.startDate,
      endDate: searchParams.get("endDate") ?? searchParams.get("to") ?? dateRange.endDate,
      page: parsePage(searchParams.get("page"))
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
  return apiErrorResponse(error, "판례 API 호출 중 오류가 발생했습니다.");
}
