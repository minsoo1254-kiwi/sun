import { NextResponse } from "next/server";
import { searchAdminInterpretations } from "@/lib/admin-interpretations-store";
import { searchCases } from "@/lib/law-api";
import { apiErrorResponse } from "@/lib/api-error-response";
import { assertRateLimit, getClientIp } from "@/lib/rate-limit";
import { normalizeKeyword, parsePage } from "@/lib/security";
import type { ResultTypeFilter } from "@/types/admin-interpretation";
import type { CaseSearchRange } from "@/types/case";
import type { UnifiedCaseSearchResult, UnifiedSearchResponse } from "@/types/search";

export async function GET(request: Request) {
  try {
    assertRateLimit(`unified-search:${getClientIp(request)}`, 60, 60 * 1000);
    return await handleSearch(request);
  } catch (error) {
    return apiErrorResponse(error, "검색 중 오류가 발생했습니다.");
  }
}

async function handleSearch(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = normalizeKeyword(searchParams.get("keyword") ?? searchParams.get("query") ?? "");
  const type = normalizeResultType(searchParams.get("type"));

  const response: UnifiedSearchResponse = {
    keyword,
    type,
    page: parsePage(searchParams.get("page")),
    caseTotalCount: 0,
    caseDisplay: 20,
    results: [],
    caseResults: [],
    adminInterpretationResults: [],
    errors: {}
  };

  if (type === "all" || type === "case") {
    try {
      const caseResponse = await searchCases({
        query: keyword,
        search: normalizeSearchRange(searchParams.get("search")),
        court: searchParams.get("court") ?? "",
        startDate: searchParams.get("startDate") ?? "",
        endDate: searchParams.get("endDate") ?? "",
        page: response.page
      });

      response.caseTotalCount = caseResponse.totalCount;
      response.caseDisplay = caseResponse.display;
      response.caseResults = caseResponse.items.map(
        (item): UnifiedCaseSearchResult => ({
          ...item,
          type: "case",
          label: "판례",
          source: "법제처"
        })
      );
    } catch {
      response.errors.cases = "판례 API 호출에 실패했습니다.";
    }
  }

  if (type === "all" || type === "admin_interpretation") {
    try {
      response.adminInterpretationResults = await searchAdminInterpretations(keyword);
    } catch {
      response.errors.adminInterpretations = "행정해석 검색에 실패했습니다.";
    }
  }

  response.results = [...response.caseResults, ...response.adminInterpretationResults];

  return NextResponse.json(response);
}

function normalizeSearchRange(value: string | null): CaseSearchRange {
  return value === "1" ? "1" : "2";
}

function normalizeResultType(value: string | null): ResultTypeFilter {
  if (value === "case" || value === "판례") {
    return "case";
  }

  if (value === "admin_interpretation" || value === "행정해석") {
    return "admin_interpretation";
  }

  return "all";
}
