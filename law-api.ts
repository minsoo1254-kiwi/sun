import { createHrCheckpoints } from "@/lib/hr-checkpoints";
import { formatDate, normalizeDateInput, stripHtml } from "@/lib/format";
import type { CaseDetail, CaseSearchItem, CaseSearchRange, CaseSummary, SearchCasesResponse } from "@/types/case";
import { LawApiError } from "@/types/case";

const LAW_SEARCH_URL = "https://www.law.go.kr/DRF/lawSearch.do";
const LAW_DETAIL_URL = "https://www.law.go.kr/DRF/lawService.do";
const DEFAULT_DISPLAY = 20;

type SearchCasesParams = {
  query: string;
  search?: CaseSearchRange;
  court?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
};

type UnknownRecord = Record<string, unknown>;

export async function searchCases(params: SearchCasesParams): Promise<SearchCasesResponse> {
  const query = params.query.trim();

  if (!query) {
    throw new LawApiError("MISSING_QUERY", "검색어를 입력해주세요.", 400);
  }

  const oc = getLawApiKey();
  const page = Number.isFinite(params.page) && params.page && params.page > 0 ? params.page : 1;
  const url = new URL(LAW_SEARCH_URL);

  url.searchParams.set("OC", oc);
  url.searchParams.set("target", "prec");
  url.searchParams.set("type", "JSON");
  url.searchParams.set("search", params.search ?? "2");
  url.searchParams.set("query", query);
  url.searchParams.set("display", String(DEFAULT_DISPLAY));
  url.searchParams.set("page", String(page));
  url.searchParams.set("sort", "ddes");

  const json = await fetchLawJson(url);
  const root = asRecord(json.PrecSearch ?? json.precSearch ?? json);
  const rawItems = toArray(root.prec ?? root.Prec ?? root.판례);
  const startDate = normalizeDateInput(params.startDate ?? null);
  const endDate = normalizeDateInput(params.endDate ?? null);
  const court = params.court?.trim();

  const summaryItems = rawItems
    .map(normalizeCaseSummary)
    .filter((item) => filterByCourt(item, court))
    .filter((item) => filterByDate(item, startDate, endDate));
  const items = (await enrichCaseSearchItems(summaryItems))
    .filter((item) => item.detailStatus === "loaded")
    .map(removeSearchDetailContent);

  return {
    items,
    totalCount: toNumber(root.totalCnt ?? root.totalCount ?? root.전체건수, summaryItems.length),
    page,
    display: DEFAULT_DISPLAY
  };
}

export async function getCaseDetail(id: string, lm = ""): Promise<CaseDetail> {
  const caseId = id.trim();
  const caseName = lm.trim();

  if (!caseId) {
    throw new LawApiError("NOT_FOUND", "판례를 찾을 수 없습니다.", 404);
  }

  const oc = getLawApiKey();
  const url = new URL(LAW_DETAIL_URL);

  url.searchParams.set("OC", oc);
  url.searchParams.set("target", "prec");
  url.searchParams.set("type", "JSON");
  url.searchParams.set("ID", caseId);

  const root = await fetchCaseDetailRecord(url, caseName);

  const detail: CaseDetail = {
    ...normalizeCaseSummary(root),
    id: pickString(root, ["판례정보일련번호", "판례일련번호", "ID", "id"]) || caseId,
    serialNumber: pickString(root, ["판례정보일련번호", "판례일련번호", "ID", "id"]) || caseId,
    issues: pickString(root, ["판시사항", "issues"]),
    summary: pickString(root, ["판결요지", "요지", "summary"]),
    referenceStatutes: pickString(root, ["참조조문", "referenceStatutes"]),
    referenceCases: pickString(root, ["참조판례", "referenceCases"]),
    content: pickString(root, ["판례내용", "전문", "content"]),
    checkpoints: createHrCheckpoints("")
  };

  const checkpointSource = [
    detail.title,
    detail.caseNumber,
    detail.issues,
    detail.summary,
    detail.referenceStatutes,
    detail.content
  ].join("\n");

  return {
    ...detail,
    checkpoints: createHrCheckpoints(checkpointSource)
  };
}

function normalizeCaseSummary(value: unknown): CaseSummary {
  const record = asRecord(value);
  const id = pickString(record, ["판례일련번호", "판례정보일련번호", "ID", "id"]);

  return {
    id,
    serialNumber: id,
    title: pickString(record, ["사건명", "판례명", "caseName", "title"]),
    caseNumber: pickString(record, ["사건번호", "caseNumber"]),
    courtName: pickString(record, ["법원명", "courtName"]),
    decisionDate: formatDate(pickString(record, ["선고일자", "decisionDate", "선고일"])),
    declaration: pickString(record, ["선고", "declaration"]),
    courtTypeCode: pickString(record, ["법원종류코드", "courtTypeCode"]),
    caseTypeName: pickString(record, ["사건종류명", "caseTypeName"]),
    caseTypeCode: pickString(record, ["사건종류코드", "caseTypeCode"]),
    judgmentType: pickString(record, ["판결유형", "judgmentType", "사건종류명"]) || "-",
    sourceName: pickString(record, ["데이터출처명", "sourceName"]),
    detailLink: normalizeDetailLink(pickString(record, ["판례상세링크", "detailLink"]))
  };
}

async function enrichCaseSearchItems(items: CaseSummary[]): Promise<CaseSearchItem[]> {
  return mapWithConcurrency(items, 4, async (item) => {
    if (!item.id) {
      return toSearchItem(item);
    }

    try {
      const detail = await getCaseDetail(item.id, item.title);

      return {
        ...item,
        title: detail.title || item.title,
        caseNumber: detail.caseNumber || item.caseNumber,
        courtName: detail.courtName || item.courtName,
        decisionDate: detail.decisionDate || item.decisionDate,
        declaration: detail.declaration || item.declaration,
        courtTypeCode: detail.courtTypeCode || item.courtTypeCode,
        caseTypeName: detail.caseTypeName || item.caseTypeName,
        caseTypeCode: detail.caseTypeCode || item.caseTypeCode,
        judgmentType: detail.judgmentType || item.judgmentType,
        issues: detail.issues,
        summary: detail.summary,
        contentPreview: createPreview(detail.content),
        checkpoints: detail.checkpoints,
        detailStatus: "loaded",
        detailMessage: ""
      };
    } catch (error) {
      return toSearchItem(
        item,
        error instanceof LawApiError
          ? error.message
          : "상세 내용을 불러오지 못했습니다."
      );
    }
  });
}

function toSearchItem(item: CaseSummary, message = "상세 내용을 불러오지 못했습니다."): CaseSearchItem {
  return {
    ...item,
    issues: "",
    summary: "",
    contentPreview: "",
    checkpoints: null,
    detailStatus: "unavailable",
    detailMessage: item.sourceName
      ? `${message} 출처: ${item.sourceName}`
      : message
  };
}

function removeSearchDetailContent(item: CaseSearchItem): CaseSearchItem {
  return {
    ...item,
    issues: "",
    summary: "",
    contentPreview: "",
    checkpoints: null,
    detailMessage: ""
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

function createPreview(value: string, maxLength = 500) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
}

async function fetchLawJson(url: URL): Promise<UnknownRecord> {
  let response: Response;

  try {
    response = await fetch(url, { next: { revalidate: 300 } });
  } catch {
    throw new LawApiError("LAW_API_ERROR", "판례 API 호출 중 오류가 발생했습니다.", 502);
  }

  if (!response.ok) {
    throw new LawApiError("LAW_API_ERROR", "판례 API 호출 중 오류가 발생했습니다.", response.status);
  }

  let payload: UnknownRecord;

  try {
    payload = (await response.json()) as UnknownRecord;
  } catch {
    throw new LawApiError("LAW_API_ERROR", "판례 API 호출 중 오류가 발생했습니다.", 502);
  }

  assertValidLawPayload(payload);
  return payload;
}

async function fetchCaseDetailRecord(url: URL, caseName: string): Promise<UnknownRecord> {
  try {
    const json = await fetchLawJson(url);
    return asRecord(json.PrecService ?? json.precService ?? json);
  } catch (error) {
    if (!(error instanceof LawApiError)) {
      throw error;
    }

    const xmlUrl = new URL(url.toString());
    xmlUrl.searchParams.set("type", "XML");

    try {
      return await fetchLawXmlRecord(xmlUrl);
    } catch (xmlError) {
      if (!caseName || !(xmlError instanceof LawApiError)) {
        throw xmlError;
      }

      const namedJsonUrl = new URL(url.toString());
      namedJsonUrl.searchParams.set("LM", caseName);

      try {
        const json = await fetchLawJson(namedJsonUrl);
        return asRecord(json.PrecService ?? json.precService ?? json);
      } catch {
        const namedXmlUrl = new URL(xmlUrl.toString());
        namedXmlUrl.searchParams.set("LM", caseName);
        return fetchLawXmlRecord(namedXmlUrl);
      }
    }
  }
}

async function fetchLawXmlRecord(url: URL): Promise<UnknownRecord> {
  let response: Response;

  try {
    response = await fetch(url, { next: { revalidate: 300 } });
  } catch {
    throw new LawApiError("LAW_API_ERROR", "판례 API 호출 중 오류가 발생했습니다.", 502);
  }

  if (!response.ok) {
    throw new LawApiError("LAW_API_ERROR", "판례 API 호출 중 오류가 발생했습니다.", response.status);
  }

  const xml = await response.text();
  const lawMessage = extractXmlText(xml, "Law");

  if (lawMessage) {
    throw new LawApiError("LAW_API_ERROR", lawMessage, 502);
  }

  const record: UnknownRecord = {};
  const fields = [
    "판례정보일련번호",
    "판례일련번호",
    "사건명",
    "사건번호",
    "선고일자",
    "선고",
    "법원명",
    "법원종류코드",
    "사건종류명",
    "사건종류코드",
    "판결유형",
    "판시사항",
    "판결요지",
    "참조조문",
    "참조판례",
    "판례내용"
  ];

  fields.forEach((field) => {
    const value = extractXmlText(xml, field);

    if (value) {
      record[field] = value;
    }
  });

  if (!record.판례정보일련번호 && !record.사건명) {
    throw new LawApiError("LAW_API_ERROR", "상세 내용을 불러오지 못했습니다.", 502);
  }

  return record;
}

function assertValidLawPayload(payload: UnknownRecord) {
  const result = pickRawString(payload, ["result"]);
  const message = pickRawString(payload, ["msg", "message"]);
  const lawMessage = pickRawString(payload, ["Law"]);

  if (result && message && !payload.PrecSearch && !payload.precSearch && !payload.PrecService && !payload.precService) {
    throw new LawApiError("LAW_API_ERROR", message, 502);
  }

  if (lawMessage && !payload.PrecSearch && !payload.precSearch && !payload.PrecService && !payload.precService) {
    throw new LawApiError("LAW_API_ERROR", lawMessage, 502);
  }
}

function getLawApiKey() {
  const key = process.env.LAW_API_KEY?.trim();

  if (!key) {
    throw new LawApiError("MISSING_API_KEY", "LAW_API_KEY가 설정되지 않았습니다.", 500);
  }

  if (/^https?:\/\//i.test(key)) {
    throw new LawApiError(
      "MISSING_API_KEY",
      "LAW_API_KEY에는 API URL이 아니라 신청한 API인증값(OC)만 입력해주세요.",
      500
    );
  }

  return key;
}

function pickString(record: UnknownRecord, keys: string[]) {
  return stripHtml(pickRawString(record, keys));
}

function pickRawString(record: UnknownRecord, keys: string[]) {
  const found = keys.map((key) => record[key]).find((value) => value !== undefined && value !== null);
  return String(found ?? "");
}

function extractXmlText(xml: string, tagName: string) {
  const match = xml.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`));

  if (!match) {
    return "";
  }

  return match[1]
    .replace(/^<!\[CDATA\[/, "")
    .replace(/\]\]>$/, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function normalizeDetailLink(value: string) {
  if (!value) {
    return "";
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://www.law.go.kr${value}`;
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : {};
}

function toArray(value: unknown) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function filterByCourt(item: CaseSummary, court?: string) {
  if (!court) {
    return true;
  }

  return item.courtName.includes(court);
}

function filterByDate(item: CaseSummary, startDate: string, endDate: string) {
  const decisionDate = normalizeDateInput(item.decisionDate);

  if (!decisionDate) {
    return true;
  }

  if (startDate && decisionDate < startDate) {
    return false;
  }

  if (endDate && decisionDate > endDate) {
    return false;
  }

  return true;
}
