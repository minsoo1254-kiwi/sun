"use client";

import { FormEvent, useState } from "react";

type SearchResponse = {
  keyword?: string;
  data?: unknown;
  message?: string;
  status?: number;
  error?: string;
};

export default function Home() {
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`/api/search?keyword=${encodeURIComponent(keyword)}`);
      const payload = (await response.json()) as SearchResponse;

      setResult({
        ...payload,
        status: response.status
      });
    } catch (error) {
      setResult({
        message: "검색 요청 중 오류가 발생했습니다.",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <section className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">외부 API 검색</h1>
        <form className="mt-6 flex gap-3" onSubmit={handleSubmit}>
          <input
            className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="검색어를 입력하세요"
            value={keyword}
          />
          <button
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={loading}
            type="submit"
          >
            {loading ? "검색 중..." : "검색"}
          </button>
        </form>

        <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold text-slate-700">결과</h2>
          <pre className="mt-3 max-h-[520px] overflow-auto whitespace-pre-wrap text-sm leading-6 text-slate-800">
            {result ? JSON.stringify(result, null, 2) : "검색 결과가 여기에 표시됩니다."}
          </pre>
        </div>
      </section>
    </main>
  );
}
