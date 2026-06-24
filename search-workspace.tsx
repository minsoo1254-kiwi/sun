"use client";

import Link from "next/link";
import { RotateCcw, Search } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { CaseSearchItem, CaseSearchRange, SearchCasesResponse } from "@/types/case";

const COURT_OPTIONS = ["", "대법원", "서울고등법원", "서울중앙지방법원", "부산지방법원", "대구지방법원"];
const SEARCH_STORAGE_KEY = "hr-law-case-search-state-v1";

type SearchState = {
  query: string;
  search: CaseSearchRange;
  court: string;
  startDate: string;
  endDate: string;
  page: number;
};

type StoredSearchState = {
  form: SearchState;
  items: CaseSearchItem[];
  totalCount: number;
  message: string;
  hasSearched: boolean;
};

const INITIAL_STATE: SearchState = {
  query: "",
  search: "2",
  court: "",
  startDate: "",
  endDate: "",
  page: 1
};

export default function SearchWorkspace() {
  const [form, setForm] = useState<SearchState>(INITIAL_STATE);
  const [items, setItems] = useState<CaseSearchItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const stored = restoreStoredSearch();

      if (!stored) {
        return;
      }

      setForm(stored.form);
      setItems(stored.items);
      setTotalCount(stored.totalCount);
      setMessage(stored.message);
      setHasSearched(stored.hasSearched);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const pageCountText = useMemo(() => {
    if (!hasSearched || totalCount === 0) {
      return "";
    }

    return `전체 ${totalCount.toLocaleString("ko-KR")}건 중 ${items.length}건 표시`;
  }, [hasSearched, items.length, totalCount]);

  async function runSearch(nextPage = 1) {
    const query = form.query.trim();

    if (!query) {
      setMessage("검색어를 입력해주세요.");
      setItems([]);
      setTotalCount(0);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setMessage("");

    const params = new URLSearchParams({
      query,
      search: form.search,
      court: form.court,
      startDate: form.startDate,
      endDate: form.endDate,
      page: String(nextPage)
    });

    try {
      const response = await fetch(`/api/cases/search?${params.toString()}`);
      const payload = (await response.json()) as SearchCasesResponse & { message?: string };

      if (!response.ok) {
        setMessage(payload.message ?? "판례 API 호출 중 오류가 발생했습니다.");
        setItems([]);
        setTotalCount(0);
        return;
      }

      setItems(payload.items);
      setTotalCount(payload.totalCount);
      const nextForm = { ...form, query, page: payload.page };
      const nextMessage = payload.items.length === 0 ? "검색 결과가 없습니다." : "";

      setForm(nextForm);
      setHasSearched(true);
      setMessage(nextMessage);
      storeSearch({
        form: nextForm,
        items: payload.items,
        totalCount: payload.totalCount,
        message: nextMessage,
        hasSearched: true
      });
    } catch {
      setMessage("판례 API 호출 중 오류가 발생했습니다.");
      setItems([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runSearch(1);
  }

  function resetSearch() {
    setForm(INITIAL_STATE);
    setItems([]);
    setTotalCount(0);
    setMessage("");
    setHasSearched(false);
    window.sessionStorage.removeItem(SEARCH_STORAGE_KEY);
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 py-8">
        <header className="flex items-end justify-between gap-5 pb-3">
          <div>
            <p className="mb-2 text-sm font-bold text-[#3182f6]">Internal HR Legal Search</p>
            <h1 className="text-3xl font-bold tracking-normal text-[#191f28]">HR 노동법 판례 검색</h1>
          </div>
          <div className="hidden rounded-md border border-[#e5e8eb] bg-white px-4 py-3 text-sm font-medium text-[#6b7684] shadow-panel md:block">
            법제처 공개 API 기반 판례 검색 보조도구
          </div>
        </header>

        <section className="rounded-md border border-[#e5e8eb] bg-white p-5 shadow-panel">
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_180px_180px_180px_104px]">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-[#4e5968]">검색어</span>
                <input
                  className="h-11 rounded-md border border-[#d1d6db] bg-[#fbfcfd] px-3 text-sm text-[#191f28] outline-none transition placeholder:text-[#8b95a1] focus:border-[#3182f6] focus:bg-white focus:ring-2 focus:ring-[#e8f3ff]"
                  value={form.query}
                  onChange={(event) => setForm((current) => ({ ...current, query: event.target.value }))}
                  placeholder="해고, 수습평가, 연차, 포괄임금"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-[#4e5968]">검색범위</span>
                <select
                  className="h-11 rounded-md border border-[#d1d6db] bg-[#fbfcfd] px-3 text-sm text-[#191f28] outline-none transition focus:border-[#3182f6] focus:bg-white focus:ring-2 focus:ring-[#e8f3ff]"
                  value={form.search}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, search: event.target.value as CaseSearchRange }))
                  }
                >
                  <option value="1">판례명 검색</option>
                  <option value="2">본문 검색</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-[#4e5968]">법원명</span>
                <select
                  className="h-11 rounded-md border border-[#d1d6db] bg-[#fbfcfd] px-3 text-sm text-[#191f28] outline-none transition focus:border-[#3182f6] focus:bg-white focus:ring-2 focus:ring-[#e8f3ff]"
                  value={form.court}
                  onChange={(event) => setForm((current) => ({ ...current, court: event.target.value }))}
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
                  type="date"
                  value={form.startDate}
                  onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-[#4e5968]">선고 종료일</span>
                <input
                  className="h-11 rounded-md border border-[#d1d6db] bg-[#fbfcfd] px-3 text-sm text-[#191f28] outline-none transition focus:border-[#3182f6] focus:bg-white focus:ring-2 focus:ring-[#e8f3ff]"
                  type="date"
                  value={form.endDate}
                  onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
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
          </form>
        </section>

        <section className="rounded-md border border-[#e5e8eb] bg-white shadow-panel">
          <div className="flex min-h-14 items-center justify-between gap-4 border-b border-[#e5e8eb] px-5 py-4">
            <h2 className="text-base font-bold text-[#191f28]">검색 결과</h2>
            <p className="text-sm font-medium text-[#8b95a1]">{pageCountText}</p>
          </div>

          {message ? <div className="border-b border-[#f2f4f6] px-5 py-4 text-sm font-semibold text-[#f04452]">{message}</div> : null}

          {items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full table-fixed divide-y divide-[#e5e8eb] text-sm">
                <thead className="bg-[#fbfcfd] text-left text-xs font-bold uppercase text-[#8b95a1]">
                  <tr>
                    <th className="w-[30%] px-5 py-3">사건명</th>
                    <th className="w-[15%] px-5 py-3">사건번호</th>
                    <th className="w-[16%] px-5 py-3">법원명</th>
                    <th className="w-[11%] px-5 py-3">선고일자</th>
                    <th className="w-[12%] px-5 py-3">판결유형</th>
                    <th className="w-[10%] px-5 py-3">판례일련번호</th>
                    <th className="w-[6%] px-5 py-3 text-right">상세</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2f4f6] bg-white">
                  {items.map((item) => (
                    <tr key={item.id} className="align-top transition hover:bg-[#f9fafb]">
                      <td className="px-5 py-4 font-bold text-[#191f28]">{item.title || "-"}</td>
                      <td className="px-5 py-4 font-medium text-[#4e5968]">{item.caseNumber || "-"}</td>
                      <td className="px-5 py-4 font-medium text-[#4e5968]">{item.courtName || "-"}</td>
                      <td className="px-5 py-4 font-medium text-[#4e5968]">{item.decisionDate || "-"}</td>
                      <td className="px-5 py-4 font-medium text-[#4e5968]">{item.judgmentType || "-"}</td>
                      <td className="px-5 py-4 font-mono text-xs text-[#8b95a1]">{item.serialNumber || "-"}</td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          className="inline-flex h-8 items-center rounded-md bg-[#f2f4f6] px-3 text-xs font-bold text-[#4e5968] transition hover:bg-[#e8f3ff] hover:text-[#3182f6]"
                          href={`/cases/${encodeURIComponent(item.id)}?lm=${encodeURIComponent(item.title)}`}
                        >
                          보기
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-16 text-center text-sm font-medium text-[#8b95a1]">
              {hasSearched ? "조건을 조정해서 다시 검색해보세요." : "검색어를 입력하면 결과가 표시됩니다."}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-[#e5e8eb] px-5 py-4">
            <button
              className="h-9 rounded-md border border-[#d1d6db] bg-white px-3 text-sm font-bold text-[#4e5968] transition hover:bg-[#f2f4f6] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={loading || form.page <= 1}
              onClick={() => void runSearch(form.page - 1)}
              type="button"
            >
              이전
            </button>
            <span className="text-sm font-semibold text-[#8b95a1]">{hasSearched ? `${form.page} 페이지` : ""}</span>
            <button
              className="h-9 rounded-md border border-[#d1d6db] bg-white px-3 text-sm font-bold text-[#4e5968] transition hover:bg-[#f2f4f6] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={loading || items.length === 0}
              onClick={() => void runSearch(form.page + 1)}
              type="button"
            >
              다음
            </button>
          </div>
        </section>
      </div>
    </main>
  );
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

    if (!parsed.form || !Array.isArray(parsed.items)) {
      return null;
    }

    return parsed;
  } catch {
    window.sessionStorage.removeItem(SEARCH_STORAGE_KEY);
    return null;
  }
}
