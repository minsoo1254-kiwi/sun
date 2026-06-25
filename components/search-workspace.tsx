"use client";

import Link from "next/link";
import { Check, ChevronDown, ChevronUp, Copy, ExternalLink, FileText, Highlighter, RotateCcw, Scale, Search } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import HighlightedText from "@/components/highlighted-text";
import type { ResultTypeFilter } from "@/types/admin-interpretation";
import type { CaseSearchRange } from "@/types/case";
import type { UnifiedSearchResponse, UnifiedSearchResult } from "@/types/search";

const COURT_OPTIONS = ["", "대법원", "서울고등법원", "서울중앙지방법원", "부산지방법원", "대구지방법원"];
const SEARCH_STORAGE_KEY = "hr-law-integrated-search-state-v1";
const ADMIN_INTERPRETATION_NOTICE =
  "행정해석은 행정기관의 해석 기준으로, 법원을 구속하지 않습니다. 개별 사안은 사실관계에 따라 달라질 수 있으므로 노무사 검토가 필요합니다.";
const SEARCH_RESULT_NOTICE = "본 결과는 참고용이며, 개별 사건은 노무사 또는 변호사 검토가 필요합니다.";
const LEGAL_NOTICE =
  "본 서비스는 공개된 판례 및 행정해석 자료를 검색·정리하기 위한 참고용 도구입니다. 행정해석은 행정기관의 해석 기준이며 법원의 판단과 다를 수 있습니다. 임금, 해고, 징계, 파견, 퇴직금 등 주요 노동분쟁 사안은 반드시 노무사 또는 변호사 검토가 필요합니다.";
const FREQUENT_KEYWORDS = ["연차수당", "해고", "징계", "퇴직금", "파견", "수습", "포괄임금", "통상임금"];

type SearchState = {
  query: string;
  search: CaseSearchRange;
  court: string;
  startDate: string;
  endDate: string;
  page: number;
  resultType: ResultTypeFilter;
  highlightMatches: boolean;
};

type StoredSearchState = {
  form: SearchState;
  response: UnifiedSearchResponse;
  message: string;
  hasSearched: boolean;
};

const INITIAL_STATE: SearchState = {
  query: "",
  search: "2",
  court: "",
  startDate: "",
  endDate: "",
  page: 1,
  resultType: "all",
  highlightMatches: false
};

const TYPE_OPTIONS: Array<{ value: ResultTypeFilter; label: string }> = [
  { value: "all", label: "전체" },
  { value: "case", label: "판례" },
  { value: "admin_interpretation", label: "행정해석" }
];

export default function SearchWorkspace() {
  const [form, setForm] = useState<SearchState>(INITIAL_STATE);
  const [response, setResponse] = useState<UnifiedSearchResponse | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [openAdminDetails, setOpenAdminDetails] = useState<Record<number, boolean>>({});
  const [copiedResultKey, setCopiedResultKey] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const stored = restoreStoredSearch();

      if (!stored) {
        return;
      }

      setForm(stored.form);
      setResponse(stored.response);
      setMessage(stored.message);
      setHasSearched(stored.hasSearched);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const results = response?.results ?? [];
  const pageCountText = useMemo(() => {
    if (!hasSearched || !response) {
      return "";
    }

    const caseText = `${response.caseResults.length.toLocaleString("ko-KR")}건`;
    const adminText = `${response.adminInterpretationResults.length.toLocaleString("ko-KR")}건`;

    return `판례 ${caseText} · 행정해석 ${adminText}`;
  }, [hasSearched, response]);

  async function runSearch(nextPage = 1, nextForm = form) {
    const query = nextForm.query.trim();

    if (!query) {
      setMessage("검색어를 입력해주세요.");
      setResponse(null);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setMessage("");

    const params = new URLSearchParams({
      keyword: query,
      type: nextForm.resultType,
      search: nextForm.search,
      court: nextForm.court,
      startDate: nextForm.startDate,
      endDate: nextForm.endDate,
      page: String(nextPage)
    });

    try {
      const fetchResponse = await fetch(`/api/search?${params.toString()}`);
      const payload = (await fetchResponse.json()) as UnifiedSearchResponse & { message?: string };

      if (!fetchResponse.ok) {
        setMessage(payload.message ?? "검색 중 오류가 발생했습니다.");
        setResponse(null);
        return;
      }

      const nextState = { ...nextForm, query, page: payload.page };
      const nextMessage = payload.results.length === 0 ? "검색 결과가 없습니다." : "";

      setForm(nextState);
      setResponse(payload);
      setMessage(nextMessage);
      setHasSearched(true);
      setOpenAdminDetails({});
      storeSearch({
        form: nextState,
        response: payload,
        message: nextMessage,
        hasSearched: true
      });
    } catch {
      setMessage("검색 중 오류가 발생했습니다.");
      setResponse(null);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runSearch(1, { ...form, page: 1 });
  }

  function searchFrequentKeyword(keyword: string) {
    const nextForm = { ...form, query: keyword, page: 1 };

    setForm(nextForm);
    void runSearch(1, nextForm);
  }

  function resetSearch() {
    setForm(INITIAL_STATE);
    setResponse(null);
    setMessage("");
    setHasSearched(false);
    setOpenAdminDetails({});
    setCopiedResultKey("");
    window.sessionStorage.removeItem(SEARCH_STORAGE_KEY);
  }

  function updateResultType(resultType: ResultTypeFilter) {
    const nextForm = { ...form, resultType, page: 1 };

    setForm(nextForm);

    if (hasSearched) {
      void runSearch(1, nextForm);
    }
  }

  function updateHighlightMatches(highlightMatches: boolean) {
    const nextForm = { ...form, highlightMatches };

    setForm(nextForm);

    if (hasSearched && response) {
      storeSearch({
        form: nextForm,
        response,
        message,
        hasSearched
      });
    }
  }

  const canPageCases = form.resultType !== "admin_interpretation";

  function toggleAdminDetail(id: number) {
    setOpenAdminDetails((current) => ({
      ...current,
      [id]: !current[id]
    }));
  }

  async function copyResult(result: UnifiedSearchResult) {
    const resultKey = `${result.type}-${result.id}`;

    try {
      await writeClipboard(formatResultForCopy(result));
      setCopiedResultKey(resultKey);
      window.setTimeout(() => setCopiedResultKey((current) => (current === resultKey ? "" : current)), 1800);
    } catch {
      setMessage("복사에 실패했습니다. 브라우저 권한을 확인해주세요.");
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 py-8">
        <header className="flex items-end justify-between gap-5 pb-3">
          <div>
            <p className="mb-2 text-sm font-bold text-[#3182f6]">Integrated HR Legal Search</p>
            <h1 className="text-3xl font-bold tracking-normal text-[#191f28]">노동법 판례·행정해석 통합 검색</h1>
          </div>
          <Link
            className="hidden rounded-md border border-[#e5e8eb] bg-white px-4 py-3 text-sm font-bold text-[#4e5968] shadow-panel transition hover:bg-[#f2f4f6] md:block"
            href="/admin"
          >
            관리자
          </Link>
        </header>

        <section className="rounded-md border border-[#e5e8eb] bg-white p-5 shadow-panel">
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_170px_170px_170px_170px_104px]">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-[#4e5968]">검색어</span>
                <input
                  className="h-11 rounded-md border border-[#d1d6db] bg-[#fbfcfd] px-3 text-sm text-[#191f28] outline-none transition placeholder:text-[#8b95a1] focus:border-[#3182f6] focus:bg-white focus:ring-2 focus:ring-[#e8f3ff]"
                  onChange={(event) => setForm((current) => ({ ...current, query: event.target.value }))}
                  placeholder="연차, 해고, 포괄임금, 파견"
                  value={form.query}
                />
                <div className="flex flex-wrap gap-2">
                  {FREQUENT_KEYWORDS.map((keyword) => (
                    <button
                      className="h-8 rounded-full border border-[#e5e8eb] bg-white px-3 text-xs font-bold text-[#4e5968] transition hover:border-[#3182f6] hover:bg-[#e8f3ff] hover:text-[#3182f6] disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={loading}
                      key={keyword}
                      onClick={() => searchFrequentKeyword(keyword)}
                      type="button"
                    >
                      {keyword}
                    </button>
                  ))}
                </div>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-[#4e5968]">판례 검색범위</span>
                <select
                  className="h-11 rounded-md border border-[#d1d6db] bg-[#fbfcfd] px-3 text-sm text-[#191f28] outline-none transition focus:border-[#3182f6] focus:bg-white focus:ring-2 focus:ring-[#e8f3ff]"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, search: event.target.value as CaseSearchRange }))
                  }
                  value={form.search}
                >
                  <option value="1">판례명 검색</option>
                  <option value="2">본문 검색</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-[#4e5968]">법원명</span>
                <select
                  className="h-11 rounded-md border border-[#d1d6db] bg-[#fbfcfd] px-3 text-sm text-[#191f28] outline-none transition focus:border-[#3182f6] focus:bg-white focus:ring-2 focus:ring-[#e8f3ff]"
                  onChange={(event) => setForm((current) => ({ ...current, court: event.target.value }))}
                  value={form.court}
                >
                  {COURT_OPTIONS.map((court) => (
                    <option key={court || "all"} value={court}>
                      {court || "전체 법원"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-[#4e5968]">선고 시작일</span>
                <input
                  className="h-11 rounded-md border border-[#d1d6db] bg-[#fbfcfd] px-3 text-sm text-[#191f28] outline-none transition focus:border-[#3182f6] focus:bg-white focus:ring-2 focus:ring-[#e8f3ff]"
                  onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
                  type="date"
                  value={form.startDate}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-[#4e5968]">선고 종료일</span>
                <input
                  className="h-11 rounded-md border border-[#d1d6db] bg-[#fbfcfd] px-3 text-sm text-[#191f28] outline-none transition focus:border-[#3182f6] focus:bg-white focus:ring-2 focus:ring-[#e8f3ff]"
                  onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
                  type="date"
                  value={form.endDate}
                />
              </label>

              <div className="flex items-end gap-2">
                <button
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-[#3182f6] px-4 text-sm font-bold text-white transition hover:bg-[#1b64da] disabled:cursor-not-allowed disabled:bg-[#b0b8c1] lg:flex-none"
                  disabled={loading}
                  type="submit"
                >
                  <Search aria-hidden="true" size={16} strokeWidth={2.2} />
                  {loading ? "검색 중" : "검색"}
                </button>
                <button
                  aria-label="검색결과 초기화"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-[#d1d6db] bg-white text-[#6b7684] transition hover:border-[#b0b8c1] hover:bg-[#f2f4f6] hover:text-[#191f28] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={loading}
                  onClick={resetSearch}
                  title="검색결과 초기화"
                  type="button"
                >
                  <RotateCcw aria-hidden="true" size={18} strokeWidth={2.2} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex rounded-md border border-[#d1d6db] bg-[#fbfcfd] p-1">
                {TYPE_OPTIONS.map((option) => (
                  <button
                    className={`h-9 rounded px-4 text-sm font-bold transition ${
                      form.resultType === option.value
                        ? "bg-white text-[#3182f6] shadow-sm"
                        : "text-[#6b7684] hover:text-[#191f28]"
                    }`}
                    key={option.value}
                    onClick={() => updateResultType(option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <label className="flex w-fit cursor-pointer items-center gap-3 rounded-md border border-[#e5e8eb] bg-[#fbfcfd] px-3 py-2 text-sm font-bold text-[#4e5968] transition hover:border-[#b0b8c1] hover:bg-white">
                <input
                  checked={form.highlightMatches}
                  className="h-4 w-4 accent-[#3182f6]"
                  onChange={(event) => updateHighlightMatches(event.target.checked)}
                  type="checkbox"
                />
                <span className="inline-flex items-center gap-2">
                  <Highlighter aria-hidden="true" size={16} strokeWidth={2.2} />
                  일치어 강조
                </span>
                <span className="font-medium text-[#8b95a1]">검색어와 같은 부분을 하이라이트 표시</span>
              </label>
            </div>
          </form>
        </section>

        <section className="rounded-md border border-[#e5e8eb] bg-white shadow-panel">
          <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-[#e5e8eb] px-5 py-4">
            <div>
              <h2 className="text-base font-bold text-[#191f28]">검색 결과</h2>
              <p className="mt-1 text-sm font-medium text-[#8b95a1]">{pageCountText}</p>
            </div>
            <span className="text-sm font-semibold text-[#8b95a1]">{hasSearched ? `${form.page} 페이지` : ""}</span>
          </div>

          {response?.errors.cases ? <ErrorBand message={response.errors.cases} /> : null}
          {response?.errors.adminInterpretations ? <ErrorBand message={response.errors.adminInterpretations} /> : null}
          {message ? <ErrorBand message={message} /> : null}
          {hasSearched ? (
            <div className="border-b border-[#f2f4f6] bg-[#fbfcfd] px-5 py-3 text-sm font-semibold text-[#6b7684]">
              {SEARCH_RESULT_NOTICE}
            </div>
          ) : null}

          {results.length > 0 ? (
            <div className="grid gap-3 p-5">
              {results.map((result) => (
                <ResultCard
                  copied={copiedResultKey === `${result.type}-${result.id}`}
                  highlightEnabled={form.highlightMatches}
                  highlightQuery={form.query}
                  isAdminDetailOpen={result.type === "admin_interpretation" ? Boolean(openAdminDetails[result.id]) : false}
                  key={`${result.type}-${result.id}`}
                  onCopyResult={copyResult}
                  onToggleAdminDetail={toggleAdminDetail}
                  result={result}
                />
              ))}
            </div>
          ) : (
            <div className="px-5 py-16 text-center text-sm font-medium text-[#8b95a1]">
              {hasSearched ? "조건을 조정해서 다시 검색해보세요." : "검색어를 입력하면 판례와 행정해석 결과가 함께 표시됩니다."}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-[#e5e8eb] px-5 py-4">
            <button
              className="h-9 rounded-md border border-[#d1d6db] bg-white px-3 text-sm font-bold text-[#4e5968] transition hover:bg-[#f2f4f6] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={loading || !canPageCases || form.page <= 1}
              onClick={() => void runSearch(form.page - 1)}
              type="button"
            >
              이전
            </button>
            <span className="text-sm font-semibold text-[#8b95a1]">
              {canPageCases && hasSearched ? "판례 결과는 페이지 단위로 이동합니다." : ""}
            </span>
            <button
              className="h-9 rounded-md border border-[#d1d6db] bg-white px-3 text-sm font-bold text-[#4e5968] transition hover:bg-[#f2f4f6] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={loading || !canPageCases || !response || response.caseResults.length === 0}
              onClick={() => void runSearch(form.page + 1)}
              type="button"
            >
              다음
            </button>
          </div>
        </section>

        <section className="rounded-md border border-[#ffe6b8] bg-[#fff8e1] p-5 text-sm font-semibold leading-7 text-[#8a5b00]">
          {LEGAL_NOTICE}
        </section>
      </div>
    </main>
  );
}

function ResultCard({
  result,
  highlightEnabled,
  highlightQuery,
  isAdminDetailOpen,
  copied,
  onCopyResult,
  onToggleAdminDetail
}: {
  result: UnifiedSearchResult;
  highlightEnabled: boolean;
  highlightQuery: string;
  isAdminDetailOpen: boolean;
  copied: boolean;
  onCopyResult: (result: UnifiedSearchResult) => void;
  onToggleAdminDetail: (id: number) => void;
}) {
  if (result.type === "case") {
    const detailParams = new URLSearchParams({ lm: result.title });

    if (highlightEnabled && highlightQuery.trim()) {
      detailParams.set("q", highlightQuery.trim());
      detailParams.set("highlight", "1");
    }

    return (
      <article className="rounded-md border border-[#e5e8eb] bg-white p-5 transition hover:border-[#b0b8c1] hover:bg-[#fbfcfd]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded bg-[#e8f3ff] px-2.5 py-1 text-xs font-bold text-[#3182f6]">
            <Scale aria-hidden="true" size={14} strokeWidth={2.2} />
            판례
          </span>
          <span className="font-mono text-xs font-semibold text-[#8b95a1]">{result.serialNumber || "-"}</span>
        </div>
        <h3 className="mb-3 text-lg font-bold text-[#191f28]">
          <HighlightedText enabled={highlightEnabled} query={highlightQuery} value={result.title || "판례 제목 없음"} />
        </h3>
        <dl className="mb-4 grid gap-2 text-sm text-[#4e5968] md:grid-cols-5">
          <Meta label="법원/기관" value={result.courtName} />
          <Meta label="날짜" value={result.decisionDate} />
          <Meta label="사건번호" value={result.caseNumber} />
          <Meta label="관련 법령" value={result.caseTypeName || "상세에서 확인"} />
          <Meta label="판결유형" value={result.judgmentType} />
        </dl>
        <SummaryBlock
          highlightEnabled={highlightEnabled}
          highlightQuery={highlightQuery}
          label="핵심 내용"
          value="판시사항과 판례내용은 원문 보기에서 확인할 수 있습니다."
        />
        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex h-9 items-center gap-2 rounded-md bg-[#f2f4f6] px-3 text-sm font-bold text-[#4e5968] transition hover:bg-[#e8f3ff] hover:text-[#3182f6]"
            href={`/cases/${encodeURIComponent(result.id)}?${detailParams.toString()}`}
          >
            원문 보기
            <ExternalLink aria-hidden="true" size={15} strokeWidth={2.2} />
          </Link>
          <CopyButton copied={copied} onClick={() => onCopyResult(result)} />
        </div>
      </article>
    );
  }

  const qa = deriveAdminQuestionAnswer(result.question, result.answer, result.title);

  return (
    <article className="rounded-md border border-[#e5e8eb] bg-white p-5 transition hover:border-[#b0b8c1] hover:bg-[#fbfcfd]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded bg-[#f2f4f6] px-2.5 py-1 text-xs font-bold text-[#4e5968]">
          <FileText aria-hidden="true" size={14} strokeWidth={2.2} />
          행정해석
        </span>
        {result.isSample ? <span className="rounded bg-[#fff6bf] px-2 py-1 text-xs font-bold text-[#8a5b00]">샘플 데이터</span> : null}
      </div>
      <h3 className="mb-3 text-lg font-bold text-[#191f28]">
        <HighlightedText enabled={highlightEnabled} query={highlightQuery} value={result.title} />
      </h3>
      <dl className="mb-4 grid gap-2 text-sm text-[#4e5968] md:grid-cols-4">
        <Meta label="관련 법령" value={result.law_name} />
        <Meta label="관련 조문" value={result.article} />
        <Meta label="날짜" value={result.reply_date} />
        <Meta label="법원/기관" value={result.ministry} />
      </dl>
      <SummaryBlock
        highlightEnabled={highlightEnabled}
        highlightQuery={highlightQuery}
        label="핵심 내용"
        value={qa.question}
      />
      <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold text-[#8b95a1]">
        <span>파일: {result.file_name || "-"}</span>
        <span>페이지: {result.page_no ?? "-"}</span>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          aria-expanded={isAdminDetailOpen}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-[#f2f4f6] px-3 text-sm font-bold text-[#4e5968] transition hover:bg-[#e8f3ff] hover:text-[#3182f6]"
          onClick={() => onToggleAdminDetail(result.id)}
          type="button"
        >
          {isAdminDetailOpen ? "상세내용 닫기" : "상세내용 보기"}
          {isAdminDetailOpen ? (
            <ChevronUp aria-hidden="true" size={15} strokeWidth={2.2} />
          ) : (
            <ChevronDown aria-hidden="true" size={15} strokeWidth={2.2} />
          )}
        </button>
        {result.source_url ? (
          <a
            className="inline-flex h-9 items-center gap-2 rounded-md border border-[#d1d6db] bg-white px-3 text-sm font-bold text-[#4e5968] transition hover:bg-[#f2f4f6]"
            href={result.source_url}
            rel="noreferrer"
            target="_blank"
          >
            원문 보기
            <ExternalLink aria-hidden="true" size={15} strokeWidth={2.2} />
          </a>
        ) : null}
        <CopyButton copied={copied} onClick={() => onCopyResult(result)} />
      </div>
      {isAdminDetailOpen ? (
        <div className="mb-4 grid gap-3">
          <DetailBlock
            highlightEnabled={highlightEnabled}
            highlightQuery={highlightQuery}
            label="질의 내용"
            value={qa.question}
          />
          <DetailBlock
            highlightEnabled={highlightEnabled}
            highlightQuery={highlightQuery}
            label="회시 내용"
            value={qa.answer}
          />
        </div>
      ) : null}
      <p className="rounded-md border border-[#ffe6b8] bg-[#fff8e1] px-3 py-2 text-xs font-semibold leading-5 text-[#8a5b00]">
        {ADMIN_INTERPRETATION_NOTICE}
      </p>
    </article>
  );
}

function SummaryBlock({
  label,
  value,
  highlightEnabled,
  highlightQuery
}: {
  label: string;
  value: string;
  highlightEnabled: boolean;
  highlightQuery: string;
}) {
  return (
    <section className="mb-4 rounded-md border border-[#f2f4f6] bg-[#fbfcfd] p-3">
      <h4 className="mb-2 text-xs font-bold text-[#8b95a1]">{label}</h4>
      <p className="text-sm leading-6 text-[#4e5968]">
        <HighlightedText enabled={highlightEnabled} query={highlightQuery} value={truncateText(value || "-", 220)} />
      </p>
    </section>
  );
}

function DetailBlock({
  label,
  value,
  highlightEnabled,
  highlightQuery
}: {
  label: string;
  value: string;
  highlightEnabled: boolean;
  highlightQuery: string;
}) {
  return (
    <section className="rounded-md border border-[#f2f4f6] bg-[#fbfcfd] p-3">
      <h4 className="mb-2 text-xs font-bold text-[#8b95a1]">{label}</h4>
      <p className="whitespace-pre-line text-sm leading-7 text-[#4e5968]">
        <HighlightedText enabled={highlightEnabled} query={highlightQuery} value={value || "-"} />
      </p>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="mb-1 text-xs font-bold text-[#8b95a1]">{label}</dt>
      <dd className="font-bold text-[#333d4b]">{value || "-"}</dd>
    </div>
  );
}

function CopyButton({ copied, onClick }: { copied: boolean; onClick: () => void }) {
  return (
    <button
      className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-bold transition ${
        copied
          ? "border-[#20c997] bg-[#e6fcf5] text-[#087f5b]"
          : "border-[#d1d6db] bg-white text-[#4e5968] hover:bg-[#f2f4f6]"
      }`}
      onClick={onClick}
      type="button"
    >
      {copied ? (
        <Check aria-hidden="true" size={15} strokeWidth={2.2} />
      ) : (
        <Copy aria-hidden="true" size={15} strokeWidth={2.2} />
      )}
      {copied ? "복사됨" : "복사"}
    </button>
  );
}

function ErrorBand({ message }: { message: string }) {
  return <div className="border-b border-[#f2f4f6] px-5 py-4 text-sm font-semibold text-[#f04452]">{message}</div>;
}

function deriveAdminQuestionAnswer(question: string, answer: string, title: string) {
  const normalizedQuestion = question.trim();
  const normalizedAnswer = answer.trim();

  if (normalizedQuestion) {
    return {
      question: normalizedQuestion,
      answer: normalizedAnswer || "-"
    };
  }

  const parsed = splitQuestionAnswerFromText(normalizedAnswer);

  return {
    question: parsed.question || cleanTitleQuestion(title) || "질의 내용이 분리되어 있지 않습니다. 아래 회시 내용에서 원문을 확인해주세요.",
    answer: parsed.answer || normalizedAnswer || "-"
  };
}

function splitQuestionAnswerFromText(value: string) {
  const matches = Array.from(
    value.matchAll(/(?:^|\n)\s*질\s*의\s*(?:\n|[:：])([\s\S]*?)(?:^|\n)\s*회\s*시\s*(?:\n|[:：])([\s\S]*)/gm)
  );

  if (matches.length === 0) {
    return { question: "", answer: value };
  }

  const match = matches[matches.length - 1];
  return {
    question: sanitizeExtractedText(match[1] ?? ""),
    answer: sanitizeExtractedText(match[2] ?? "")
  };
}

function cleanTitleQuestion(title: string) {
  const withoutPrefix = title.replace(/^.+?\sp\.\d+\s*-\s*/, "").trim();
  return withoutPrefix && withoutPrefix !== title ? withoutPrefix : "";
}

function sanitizeExtractedText(value: string) {
  return value.replace(/\n?\s*\d+\.\s*[\s\S]+?\s+\d+\s*$/, "").trim();
}

function truncateText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
}

function formatResultForCopy(result: UnifiedSearchResult) {
  if (result.type === "case") {
    return [
      "[자료유형] 판례",
      `[제목] ${result.title || "-"}`,
      `[법원/기관] ${result.courtName || "-"}`,
      `[날짜] ${result.decisionDate || "-"}`,
      `[관련 법령] ${result.caseTypeName || "상세에서 확인"}`,
      `[사건번호] ${result.caseNumber || "-"}`,
      "[핵심 내용] 판시사항과 판례내용은 원문 보기에서 확인할 수 있습니다."
    ].join("\n");
  }

  const qa = deriveAdminQuestionAnswer(result.question, result.answer, result.title);

  return [
    "[자료유형] 행정해석",
    `[제목] ${result.title || "-"}`,
    `[법원/기관] ${result.ministry || "-"}`,
    `[날짜] ${result.reply_date || "-"}`,
    `[관련 법령] ${result.law_name || "-"}`,
    `[관련 조문] ${result.article || "-"}`,
    `[핵심 내용] ${truncateText(qa.question || qa.answer || "-", 500)}`,
    result.source_url ? `[원문 URL] ${result.source_url}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

async function writeClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function storeSearch(state: StoredSearchState) {
  window.sessionStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify(state));
}

function restoreStoredSearch(): StoredSearchState | null {
  const raw = window.sessionStorage.getItem(SEARCH_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredSearchState;

    if (!parsed.form || !parsed.response) {
      return null;
    }

    return {
      ...parsed,
      form: {
        ...INITIAL_STATE,
        ...parsed.form,
        highlightMatches: Boolean(parsed.form.highlightMatches)
      }
    };
  } catch {
    window.sessionStorage.removeItem(SEARCH_STORAGE_KEY);
    return null;
  }
}
