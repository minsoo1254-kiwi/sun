"use client";

import Link from "next/link";
import { ArrowLeft, Check, ClipboardCopy, FileText, Loader2, Search } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import type { CaseDetail } from "@/types/case";
import type { UnifiedSearchResponse, UnifiedSearchResult } from "@/types/search";

const LEGAL_NOTICE =
  "본 보고서는 내부 검토 및 리서치 보조용 자료입니다. 개별 사안의 법적 판단은 구체적인 사실관계, 취업규칙, 근로계약서, 임금규정, 실제 운영 방식에 따라 달라질 수 있습니다. 해고, 징계, 임금, 퇴직금, 파견, 근로시간 등 분쟁 가능성이 있는 사안은 반드시 노무사 또는 변호사 검토 후 처리하시기 바랍니다.";
const PRIVACY_NOTICE =
  "회사 상황에는 직원명, 주민등록번호, 개인별 급여액, 연락처 등 개인정보를 입력하지 마세요. 입력값과 보고서는 서버에 저장하지 않고 현재 브라우저에서만 생성됩니다.";

const PURPOSE_OPTIONS = ["내부 검토용", "임원 보고용", "근로감독 대응용", "직원 안내용"] as const;
const SCOPE_OPTIONS = [
  { label: "판례만", value: "case" },
  { label: "행정해석만", value: "admin_interpretation" },
  { label: "판례 + 행정해석", value: "all" }
] as const;

const KEYWORD_EXPANSIONS: Array<{ triggers: string[]; keywords: string[] }> = [
  { triggers: ["통상임금"], keywords: ["정기성", "일률성", "소정근로 대가", "상여금", "고정수당"] },
  { triggers: ["파견"], keywords: ["불법파견", "직접고용", "지휘명령", "파견계약"] },
  { triggers: ["수습"], keywords: ["본채용 거부", "해고", "평가기준", "수습기간"] },
  { triggers: ["연차", "연차수당"], keywords: ["미사용연차", "연차수당", "회계연도", "퇴직정산"] },
  { triggers: ["징계"], keywords: ["징계사유", "징계절차", "소명기회", "징계양정"] },
  { triggers: ["해고"], keywords: ["정당한 이유", "해고예고", "서면통지", "부당해고"] },
  { triggers: ["포괄임금"], keywords: ["고정OT", "연장근로수당", "근로시간 산정"] }
];

type Purpose = (typeof PURPOSE_OPTIONS)[number];
type Scope = (typeof SCOPE_OPTIONS)[number]["value"];

type ReportForm = {
  topic: string;
  companySituation: string;
  purpose: Purpose;
  scope: Scope;
  startDate: string;
  endDate: string;
  focus: string;
};

type ReportSource = {
  id: string;
  source_type: "판례" | "행정해석";
  title: string;
  institution: string;
  date: string;
  law: string;
  summary: string;
  originalUrl: string;
  detail?: CaseDetail;
};

const INITIAL_FORM: ReportForm = {
  topic: "",
  companySituation: "",
  purpose: "내부 검토용",
  scope: "all",
  startDate: "",
  endDate: "",
  focus: ""
};

export default function ResearchReportWorkspace() {
  const [form, setForm] = useState<ReportForm>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [report, setReport] = useState("");
  const [sources, setSources] = useState<ReportSource[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [copied, setCopied] = useState<"report" | "sources" | "">("");

  const sourceMarkdown = useMemo(() => formatSourcesMarkdown(sources), [sources]);

  async function generateReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const topic = form.topic.trim();

    if (!topic) {
      setMessage("검토 주제를 입력해주세요.");
      setReport("");
      setSources([]);
      return;
    }

    setLoading(true);
    setMessage("");
    setReport("");
    setSources([]);
    setCopied("");

    try {
      const nextKeywords = buildSearchKeywords(topic, form.focus);
      const results = await searchReportSources(nextKeywords, form);
      const nextSources = await enrichCaseSources(results.slice(0, 10));
      const markdown = buildMarkdownReport(form, nextKeywords, nextSources);

      setKeywords(nextKeywords);
      setSources(nextSources);
      setReport(markdown);
      setMessage(nextSources.length === 0 ? "관련 자료가 충분하지 않아 추가 검토가 필요합니다." : "");
    } catch {
      setMessage("리서치 보고서 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function copyText(kind: "report" | "sources", value: string) {
    if (!value.trim()) {
      setMessage(kind === "report" ? "복사할 보고서가 없습니다." : "복사할 출처 목록이 없습니다.");
      return;
    }

    try {
      await writeClipboard(value);
      setCopied(kind);
      window.setTimeout(() => setCopied((current) => (current === kind ? "" : current)), 1800);
    } catch {
      setMessage("복사에 실패했습니다. 브라우저 권한을 확인해주세요.");
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto grid w-full max-w-7xl gap-5 px-6 py-8">
        <header className="flex flex-wrap items-end justify-between gap-4 pb-3">
          <div>
            <Link className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-[#3182f6]" href="/">
              <ArrowLeft aria-hidden="true" size={16} strokeWidth={2.2} />
              통합 검색으로 돌아가기
            </Link>
            <p className="mb-2 text-sm font-bold text-[#3182f6]">Research Report Builder</p>
            <h1 className="text-3xl font-bold tracking-normal text-[#191f28]">판례·행정해석 기반 리서치 보고서</h1>
          </div>
          <Link
            className="rounded-md border border-[#e5e8eb] bg-white px-4 py-3 text-sm font-bold text-[#4e5968] shadow-panel transition hover:bg-[#f2f4f6]"
            href="/admin"
          >
            관리자
          </Link>
        </header>

        <section className="rounded-md border border-[#ffe6b8] bg-[#fff8e1] p-4 text-sm font-semibold leading-6 text-[#8a5b00]">
          {LEGAL_NOTICE}
        </section>

        <section className="rounded-md border border-[#e5e8eb] bg-white p-5 shadow-panel">
          <form className="grid gap-5" onSubmit={generateReport}>
            <div className="rounded-md border border-[#e8f3ff] bg-[#f7fbff] p-4 text-sm font-semibold leading-6 text-[#4e5968]">
              {PRIVACY_NOTICE}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <TextField
                label="검토 주제"
                onChange={(value) => setForm((current) => ({ ...current, topic: value }))}
                placeholder="예: 포괄임금 기획감독 대응방안"
                required
                value={form.topic}
              />
              <TextField
                label="중점 검토사항"
                onChange={(value) => setForm((current) => ({ ...current, focus: value }))}
                placeholder="예: 고정OT, 근로시간 기록, 임금체불 리스크"
                value={form.focus}
              />
            </div>

            <TextArea
              label="회사 상황"
              onChange={(value) => setForm((current) => ({ ...current, companySituation: value }))}
              placeholder="개인정보 없이 제도 운영 방식, 규정 유무, 현재 쟁점만 입력하세요."
              value={form.companySituation}
            />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-[#4e5968]">보고서 목적</span>
                <select
                  className="h-11 rounded-md border border-[#d1d6db] bg-[#fbfcfd] px-3 text-sm text-[#191f28] outline-none transition focus:border-[#3182f6] focus:bg-white focus:ring-2 focus:ring-[#e8f3ff]"
                  onChange={(event) => setForm((current) => ({ ...current, purpose: event.target.value as Purpose }))}
                  value={form.purpose}
                >
                  {PURPOSE_OPTIONS.map((purpose) => (
                    <option key={purpose} value={purpose}>
                      {purpose}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-[#4e5968]">자료 범위</span>
                <select
                  className="h-11 rounded-md border border-[#d1d6db] bg-[#fbfcfd] px-3 text-sm text-[#191f28] outline-none transition focus:border-[#3182f6] focus:bg-white focus:ring-2 focus:ring-[#e8f3ff]"
                  onChange={(event) => setForm((current) => ({ ...current, scope: event.target.value as Scope }))}
                  value={form.scope}
                >
                  {SCOPE_OPTIONS.map((scope) => (
                    <option key={scope.value} value={scope.value}>
                      {scope.label}
                    </option>
                  ))}
                </select>
              </label>

              <TextField
                label="검색 시작일"
                onChange={(value) => setForm((current) => ({ ...current, startDate: value }))}
                type="date"
                value={form.startDate}
              />
              <TextField
                label="검색 종료일"
                onChange={(value) => setForm((current) => ({ ...current, endDate: value }))}
                type="date"
                value={form.endDate}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f2f4f6] pt-4">
              <p className="text-sm font-semibold text-[#8b95a1]">
                생성된 보고서와 입력값은 서버에 저장되지 않습니다.
              </p>
              <button
                className="inline-flex h-11 items-center gap-2 rounded-md bg-[#3182f6] px-4 text-sm font-bold text-white transition hover:bg-[#1b64da] disabled:cursor-not-allowed disabled:bg-[#b0b8c1]"
                disabled={loading}
                type="submit"
              >
                {loading ? (
                  <Loader2 aria-hidden="true" className="animate-spin" size={16} strokeWidth={2.2} />
                ) : (
                  <Search aria-hidden="true" size={16} strokeWidth={2.2} />
                )}
                {loading ? "자료 검색 중" : "보고서 생성"}
              </button>
            </div>
          </form>
        </section>

        {message ? <ErrorBand message={message} /> : null}

        {keywords.length > 0 ? (
          <section className="rounded-md border border-[#e5e8eb] bg-white p-5 shadow-panel">
            <h2 className="mb-3 text-base font-bold text-[#191f28]">확장 검색 키워드</h2>
            <div className="flex flex-wrap gap-2">
              {keywords.map((keyword) => (
                <span className="rounded-full bg-[#e8f3ff] px-3 py-1 text-xs font-bold text-[#3182f6]" key={keyword}>
                  {keyword}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {report ? (
          <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
            <article className="rounded-md border border-[#e5e8eb] bg-white shadow-panel">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e8eb] px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-[#191f28]">생성된 보고서</h2>
                  <p className="mt-1 text-sm font-medium text-[#8b95a1]">화면용 문서 보기 · 복사 시 Markdown · 서버 저장 없음</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <CopyAction copied={copied === "report"} label="보고서 복사" onClick={() => void copyText("report", report)} />
                  <CopyAction
                    copied={copied === "sources"}
                    label="출처만 복사"
                    onClick={() => void copyText("sources", sourceMarkdown)}
                  />
                </div>
              </div>
              <ReportDocument markdown={report} />
            </article>

            <aside className="h-fit rounded-md border border-[#e5e8eb] bg-white p-5 shadow-panel">
              <div className="mb-4 flex items-center gap-2">
                <FileText aria-hidden="true" className="text-[#3182f6]" size={18} strokeWidth={2.2} />
                <h2 className="text-base font-bold text-[#191f28]">사용 출처</h2>
              </div>
              <div className="grid gap-3">
                {sources.map((source) => (
                  <article className="rounded-md border border-[#f2f4f6] bg-[#fbfcfd] p-3" key={source.id}>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded px-2 py-1 text-xs font-bold ${
                          source.source_type === "판례" ? "bg-[#e8f3ff] text-[#3182f6]" : "bg-[#f2f4f6] text-[#4e5968]"
                        }`}
                      >
                        {source.source_type}
                      </span>
                      <span className="text-xs font-semibold text-[#8b95a1]">{source.date || "날짜 없음"}</span>
                    </div>
                    <h3 className="text-sm font-bold leading-6 text-[#191f28]">{source.title}</h3>
                    <p className="mt-1 text-xs font-semibold text-[#6b7684]">{source.institution || "-"}</p>
                  </article>
                ))}
              </div>
            </aside>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold text-[#4e5968]">{label}</span>
      <input
        className="h-11 rounded-md border border-[#d1d6db] bg-[#fbfcfd] px-3 text-sm text-[#191f28] outline-none transition placeholder:text-[#8b95a1] focus:border-[#3182f6] focus:bg-white focus:ring-2 focus:ring-[#e8f3ff]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold text-[#4e5968]">{label}</span>
      <textarea
        className="min-h-28 rounded-md border border-[#d1d6db] bg-[#fbfcfd] px-3 py-2 text-sm leading-6 text-[#191f28] outline-none transition placeholder:text-[#8b95a1] focus:border-[#3182f6] focus:bg-white focus:ring-2 focus:ring-[#e8f3ff]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function CopyAction({ label, copied, onClick }: { label: string; copied: boolean; onClick: () => void }) {
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
        <ClipboardCopy aria-hidden="true" size={15} strokeWidth={2.2} />
      )}
      {copied ? "복사됨" : label}
    </button>
  );
}

type ReportBlock =
  | { type: "heading"; level: 3 | 4; text: string }
  | { type: "quote"; lines: string[] }
  | { type: "table"; rows: string[][] }
  | { type: "bullets"; items: Array<{ level: number; text: string }> }
  | { type: "paragraph"; text: string };

type ReportSection = {
  title: string;
  blocks: ReportBlock[];
};

function ReportDocument({ markdown }: { markdown: string }) {
  const { title, introBlocks, sections } = parseReportMarkdown(markdown);

  return (
    <div className="max-h-[760px] overflow-auto bg-[#f7f8fa] p-5">
      <div className="mx-auto grid max-w-4xl gap-5">
        <section className="rounded-md border border-[#e5e8eb] bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold leading-9 text-[#191f28]">{title || "리서치 보고서"}</h1>
          <div className="mt-5 grid gap-4">{introBlocks.map((block, index) => renderReportBlock(block, `intro-${index}`))}</div>
        </section>

        {sections.map((section, index) => (
          <section className="rounded-md border border-[#e5e8eb] bg-white p-5 shadow-sm" key={`${section.title}-${index}`}>
            <div className="mb-5 flex items-center gap-3 border-b border-[#f2f4f6] pb-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#e8f3ff] text-sm font-bold text-[#3182f6]">
                {index + 1}
              </span>
              <h2 className="text-xl font-bold leading-8 text-[#191f28]">{section.title}</h2>
            </div>
            <div className="grid gap-5">{section.blocks.map((block, blockIndex) => renderReportBlock(block, `${section.title}-${blockIndex}`))}</div>
          </section>
        ))}
      </div>
    </div>
  );
}

function renderReportBlock(block: ReportBlock, key: string) {
  if (block.type === "heading") {
    const headingClass =
      block.level === 3
        ? "border-l-4 border-[#3182f6] pl-3 text-lg font-bold leading-7 text-[#191f28]"
        : "rounded bg-[#f7f8fa] px-3 py-2 text-base font-bold leading-7 text-[#333d4b]";

    return (
      <h3 className={headingClass} key={key}>
        {stripSectionNumber(block.text)}
      </h3>
    );
  }

  if (block.type === "quote") {
    return (
      <div className="rounded-md border border-[#ffe6b8] bg-[#fff8e1] p-4 text-sm font-semibold leading-7 text-[#8a5b00]" key={key}>
        {block.lines.map((line, index) => (
          <p key={`${key}-quote-${index}`}>{line}</p>
        ))}
      </div>
    );
  }

  if (block.type === "table") {
    return <ReportTable key={key} rows={block.rows} />;
  }

  if (block.type === "bullets") {
    const groupedItems = groupBulletItems(block.items);

    return (
      <ul className="grid gap-2 text-sm leading-7 text-[#333d4b]" key={key}>
        {groupedItems.map((item, index) => (
          <li
            className={`rounded-md border border-[#f2f4f6] bg-[#fbfcfd] px-3 py-2 ${
              item.level > 0 ? "whitespace-pre-line text-[#4e5968]" : "font-semibold text-[#191f28]"
            }`}
            key={`${key}-bullet-${index}`}
            style={{ marginLeft: `${Math.min(item.level, 3) * 18}px` }}
          >
            {item.text}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <p className="rounded-md bg-[#fbfcfd] px-3 py-2 text-sm leading-7 text-[#4e5968]" key={key}>
      {block.text}
    </p>
  );
}

function ReportTable({ rows }: { rows: string[][] }) {
  const cleanedRows = rows.filter((row) => !row.every((cell) => /^-+$/.test(cell.replace(/\s/g, ""))));
  const [header = [], ...bodyRows] = cleanedRows;

  if (header.length === 2 && header[0] === "항목" && header[1] === "내용") {
    return (
      <dl className="grid overflow-hidden rounded-md border border-[#e5e8eb] text-sm md:grid-cols-[160px_1fr]">
        {bodyRows.map((row, index) => (
          <div className="contents" key={`${row.join("-")}-${index}`}>
            <dt className="border-b border-[#f2f4f6] bg-[#fbfcfd] px-3 py-2 font-bold text-[#4e5968]">{row[0] || "-"}</dt>
            <dd className="border-b border-[#f2f4f6] bg-white px-3 py-2 leading-7 text-[#333d4b]">{row[1] || "-"}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <div className="overflow-auto rounded-md border border-[#e5e8eb]">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[#fbfcfd] text-[#4e5968]">
          <tr>
            {header.map((cell, index) => (
              <th className="border-b border-[#e5e8eb] px-3 py-2 font-bold" key={`${cell}-${index}`}>
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f2f4f6] text-[#333d4b]">
          {bodyRows.map((row, rowIndex) => (
            <tr key={`${row.join("-")}-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <td className="px-3 py-2 leading-7" key={`${cell}-${cellIndex}`}>
                  {cell || "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function parseReportMarkdown(markdown: string) {
  const lines = markdown.split("\n");
  const introBlocks: ReportBlock[] = [];
  const sections: ReportSection[] = [];
  let title = "";
  let index = 0;
  let currentBlocks = introBlocks;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("# ")) {
      title = trimmed.replace(/^#\s+/, "");
      index += 1;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      const section: ReportSection = {
        title: stripSectionNumber(trimmed.replace(/^##\s+/, "")),
        blocks: []
      };
      sections.push(section);
      currentBlocks = section.blocks;
      index += 1;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      currentBlocks.push({ type: "heading", level: 3, text: trimmed.replace(/^###\s+/, "") });
      index += 1;
      continue;
    }

    if (trimmed.startsWith("#### ")) {
      currentBlocks.push({ type: "heading", level: 4, text: trimmed.replace(/^####\s+/, "") });
      index += 1;
      continue;
    }

    if (trimmed.startsWith(">")) {
      const { block, nextIndex } = collectQuote(lines, index);
      currentBlocks.push(block);
      index = nextIndex;
      continue;
    }

    if (trimmed.startsWith("|")) {
      const { block, nextIndex } = collectTable(lines, index);
      currentBlocks.push(block);
      index = nextIndex;
      continue;
    }

    if (/^\s*-\s+/.test(line)) {
      const { block, nextIndex } = collectBullets(lines, index);
      currentBlocks.push(block);
      index = nextIndex;
      continue;
    }

    const { block, nextIndex } = collectParagraph(lines, index);
    currentBlocks.push(block);
    index = nextIndex;
  }

  return { title, introBlocks, sections };
}

function collectQuote(lines: string[], startIndex: number) {
  const quoteLines: string[] = [];
  let index = startIndex;

  while (index < lines.length && lines[index].trim().startsWith(">")) {
    quoteLines.push(lines[index].trim().replace(/^>\s?/, ""));
    index += 1;
  }

  return { block: { type: "quote", lines: quoteLines } as ReportBlock, nextIndex: index };
}

function collectTable(lines: string[], startIndex: number) {
  const rows: string[][] = [];
  let index = startIndex;

  while (index < lines.length && lines[index].trim().startsWith("|")) {
    rows.push(splitTableRow(lines[index]));
    index += 1;
  }

  return { block: { type: "table", rows } as ReportBlock, nextIndex: index };
}

function collectBullets(lines: string[], startIndex: number) {
  const items: Array<{ level: number; text: string }> = [];
  let index = startIndex;

  while (index < lines.length && /^\s*-\s+/.test(lines[index])) {
    const line = lines[index];
    const leadingSpaces = line.match(/^\s*/)?.[0].length ?? 0;
    items.push({
      level: Math.floor(leadingSpaces / 2),
      text: line.replace(/^\s*-\s+/, "")
    });
    index += 1;
  }

  return { block: { type: "bullets", items } as ReportBlock, nextIndex: index };
}

function collectParagraph(lines: string[], startIndex: number) {
  const paragraphLines: string[] = [];
  let index = startIndex;

  while (index < lines.length && lines[index].trim() && !isSpecialMarkdownLine(lines[index])) {
    paragraphLines.push(lines[index].trim());
    index += 1;
  }

  return { block: { type: "paragraph", text: paragraphLines.join(" ") } as ReportBlock, nextIndex: index };
}

function groupBulletItems(items: Array<{ level: number; text: string }>) {
  const grouped: Array<{ level: number; text: string }> = [];

  items.forEach((item) => {
    const previous = grouped[grouped.length - 1];

    if (previous && previous.level > 0 && previous.level === item.level) {
      previous.text = `${previous.text}\n${item.text}`;
      return;
    }

    grouped.push({ ...item });
  });

  return grouped;
}

function isSpecialMarkdownLine(line: string) {
  const trimmed = line.trim();
  return trimmed.startsWith("#") || trimmed.startsWith(">") || trimmed.startsWith("|") || /^\s*-\s+/.test(line);
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim().replace(/\\\|/g, "|"));
}

function stripSectionNumber(value: string) {
  return value.replace(/^\d+(\.\d+)?\.\s*/, "");
}

function ErrorBand({ message }: { message: string }) {
  return <div className="rounded-md border border-[#ffd6d6] bg-white px-5 py-4 text-sm font-semibold text-[#f04452] shadow-panel">{message}</div>;
}

function buildSearchKeywords(topic: string, focus: string) {
  const sourceText = `${topic} ${focus}`.trim();
  const baseKeywords = splitKeywords(sourceText);
  const expanded = KEYWORD_EXPANSIONS.flatMap((entry) =>
    entry.triggers.some((trigger) => sourceText.includes(trigger)) ? entry.keywords : []
  );

  return uniqueStrings([topic, ...baseKeywords, ...expanded]).slice(0, 8);
}

function splitKeywords(value: string) {
  return value
    .split(/[\s,，、/|]+/g)
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length >= 2);
}

async function searchReportSources(keywords: string[], form: ReportForm) {
  const resultMap = new Map<string, ReportSource>();

  for (const keyword of keywords.slice(0, 6)) {
    const params = new URLSearchParams({
      keyword,
      type: form.scope,
      search: "2",
      startDate: form.startDate,
      endDate: form.endDate,
      page: "1"
    });
    const response = await fetch(`/api/search?${params.toString()}`);
    const payload = (await response.json()) as UnifiedSearchResponse & { message?: string };

    if (!response.ok) {
      continue;
    }

    payload.results
      .map((result) => toReportSource(result))
      .filter((source) => isWithinDateRange(source.date, form.startDate, form.endDate))
      .forEach((source) => {
        if (!resultMap.has(source.id)) {
          resultMap.set(source.id, source);
        }
      });

    if (resultMap.size >= 16) {
      break;
    }
  }

  return rankSources(Array.from(resultMap.values()), keywords).slice(0, 10);
}

async function enrichCaseSources(sources: ReportSource[]) {
  const enriched = await Promise.all(
    sources.map(async (source) => {
      if (source.source_type !== "판례") {
        return source;
      }

      try {
        const response = await fetch(`/api/cases/${encodeURIComponent(source.id.replace(/^case-/, ""))}?lm=${encodeURIComponent(source.title)}`);

        if (!response.ok) {
          return source;
        }

        const detail = (await response.json()) as CaseDetail;

        return {
          ...source,
          law: detail.referenceStatutes || source.law,
          summary: normalizeLongText([detail.issues, detail.summary, detail.content].filter(Boolean).join(" ")),
          detail
        };
      } catch {
        return source;
      }
    })
  );

  return enriched;
}

function toReportSource(result: UnifiedSearchResult): ReportSource {
  if (result.type === "case") {
    const detailUrl = `/cases/${encodeURIComponent(result.id)}?lm=${encodeURIComponent(result.title)}`;

    return {
      id: `case-${result.id}`,
      source_type: "판례",
      title: result.title || "판례 제목 없음",
      institution: result.courtName || "법원명 없음",
      date: result.decisionDate || "",
      law: result.caseTypeName || result.judgmentType || "",
      summary: result.contentPreview || result.summary || result.issues || "판례 상세에서 판시사항과 판결요지를 확인해야 합니다.",
      originalUrl: typeof window === "undefined" ? detailUrl : `${window.location.origin}${detailUrl}`
    };
  }

  return {
    id: `admin-${result.id}`,
    source_type: "행정해석",
    title: result.title || "행정해석 제목 없음",
    institution: result.ministry || result.department || "고용노동부",
    date: result.reply_date || "",
    law: [result.law_name, result.article].filter(Boolean).join(" "),
    summary: normalizeLongText(result.question || result.answer || "-"),
    originalUrl: result.source_url || ""
  };
}

function rankSources(sources: ReportSource[], keywords: string[]) {
  return sources
    .map((source) => ({
      source,
      score: keywords.reduce((score, keyword) => {
        const text = `${source.title} ${source.law} ${source.summary}`.toLocaleLowerCase("ko-KR");
        return score + (text.includes(keyword.toLocaleLowerCase("ko-KR")) ? 10 : 0);
      }, 0)
    }))
    .sort((a, b) => b.score - a.score || dateValue(b.source.date) - dateValue(a.source.date))
    .map(({ source }) => source);
}

function buildMarkdownReport(form: ReportForm, keywords: string[], sources: ReportSource[]) {
  const caseSources = sources.filter((source) => source.source_type === "판례");
  const adminSources = sources.filter((source) => source.source_type === "행정해석");
  const tone = getPurposeTone(form.purpose);
  const sourceWarning = sources.length < 3 ? "\n\n> 관련 자료가 충분하지 않아 추가 검토가 필요합니다." : "";

  return [
    `> ${LEGAL_NOTICE}`,
    "",
    `# ${form.topic.trim()} 리서치 보고서`,
    "",
    formatInfoTable([
      ["보고서 목적", form.purpose],
      ["자료 범위", scopeLabel(form.scope)],
      ["검색 기간", `${form.startDate || "제한 없음"} ~ ${form.endDate || "제한 없음"}`],
      ["확장 검색 키워드", keywords.join(", ") || "-"]
    ]),
    "",
    "## 1. 결론요약",
    buildExecutiveSummary(form, sources, tone),
    "",
    "## 2. 본론",
    "### 2.1 검토 배경",
    buildBackground(form),
    "",
    "### 2.2 주요 쟁점",
    buildIssues(form, keywords),
    "",
    "### 2.3 관련 법령 및 판단기준",
    buildStandards(sources),
    "",
    "### 2.4 관련 판례 요약",
    caseSources.length > 0 ? caseSources.map((source, index) => formatSourceSummary(index, source)).join("\n\n") : "- 검색된 판례가 부족합니다.",
    "",
    "### 2.5 관련 행정해석 요약",
    adminSources.length > 0
      ? adminSources.map((source, index) => formatSourceSummary(index, source)).join("\n\n")
      : "- 검색된 행정해석이 부족합니다.",
    "",
    "### 2.6 회사 상황에 대한 실무상 리스크",
    buildRisks(form, sources),
    "",
    "## 3. 대응방안",
    "### 3.1 실행 방향",
    buildActions(form.purpose),
    "",
    "### 3.2 준비자료 체크리스트",
    buildChecklist(form.topic, keywords),
    "",
    "### 3.3 노무사 검토 필요사항",
    buildExpertReviewItems(form.topic),
    "",
    "### 3.4 유의사항",
    [
      "- 본 보고서는 검색된 공개 자료를 바탕으로 한 리서치 초안입니다.",
      "- 판례는 법원의 구체적 사실관계 판단이고, 행정해석은 행정기관의 해석 기준이므로 성격이 다릅니다.",
      "- 회사의 실제 운영 방식과 문서 증빙이 검색 자료의 사실관계와 다르면 결론이 달라질 수 있습니다.",
      `- ${LEGAL_NOTICE}`
    ].join("\n"),
    "",
    "## 사용된 판례·행정해석 목록",
    sourceWarning.trim() ? sourceWarning.trim() : "",
    formatSourcesMarkdown(sources)
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function buildExecutiveSummary(form: ReportForm, sources: ReportSource[], tone: string) {
  const caseCount = sources.filter((source) => source.source_type === "판례").length;
  const adminCount = sources.filter((source) => source.source_type === "행정해석").length;
  const sourceStatus =
    sources.length >= 3
      ? `관련 자료 ${sources.length}건을 기준으로 1차 검토했습니다.`
      : "관련 자료가 충분하지 않아 추가 검색과 전문가 검토가 필요합니다.";

  return [
    "- 결론",
    `  - ${form.topic.trim()} 사안은 문서 기준과 실제 운영 방식의 일치 여부를 먼저 확인해야 합니다.`,
    `  - ${sourceStatus}`,
    `  - 판례 ${caseCount}건, 행정해석 ${adminCount}건을 보고서 근거로 정리했습니다.`,
    "",
    "- 핵심 리스크",
    "  - 취업규칙, 근로계약서, 임금규정, 실제 운영 방식이 서로 다르면 분쟁 리스크가 커집니다.",
    "  - 증빙이 부족하면 근로감독, 부당해고, 임금체불, 파견 판단에서 불리하게 작용할 수 있습니다.",
    "",
    "- 우선 조치",
    "  - 관련 규정과 실제 운영 자료를 먼저 대조합니다.",
    "  - 자료 공백이 있는 부분은 개선계획과 보완 일정을 별도로 작성합니다.",
    `  - ${tone}`
  ].join("\n");
}

function buildBackground(form: ReportForm) {
  const situation = form.companySituation.trim() || "회사의 구체적 운영 상황은 별도로 정리되지 않았습니다.";

  return [
    "- 검토 목적",
    `  - ${form.topic.trim()}와 관련된 회사 운영 방식, 내부 규정, 증빙 수준을 점검합니다.`,
    "  - 검색된 판례와 행정해석을 기준으로 실무상 리스크와 대응방안을 정리합니다.",
    "",
    "- 회사 상황",
    ...toIndentedBullets(situation)
  ].join("\n");
}

function buildIssues(form: ReportForm, keywords: string[]) {
  const focus = form.focus.trim() || "중점 검토사항이 별도로 입력되지 않아 검색 키워드와 자료 요약을 중심으로 쟁점을 도출했습니다.";

  return [
    `- 검토 주제: ${form.topic.trim()}`,
    "- 중점 검토사항",
    ...toIndentedBullets(focus),
    "- 관련 키워드",
    `  - ${keywords.join(", ")}`
  ].join("\n");
}

function buildStandards(sources: ReportSource[]) {
  const laws = uniqueStrings(sources.map((source) => source.law).filter(Boolean)).slice(0, 8);
  const lawText =
    laws.length > 0
      ? laws.map((law) => `  - ${compactText(law, 120)}`).join("\n")
      : "  - 검색 자료에서 명확한 관련 법령명이 충분히 확인되지 않았습니다.";

  return [
    "- 관련 법령 및 조문",
    lawText,
    "",
    "- 판단기준",
    "  - 판례는 사실관계, 규정 내용, 절차 준수 여부, 사용자 운영 관행을 종합적으로 봅니다.",
    "  - 행정해석은 행정기관의 업무 처리 기준으로 참고하되, 법원 판단과 다를 수 있습니다.",
    "  - 회사 자료는 문서상 기준과 실제 운영이 일치하는지 중심으로 확인합니다."
  ].join("\n");
}

function buildRisks(form: ReportForm, sources: ReportSource[]) {
  const topic = form.topic;
  const hasCases = sources.some((source) => source.source_type === "판례");
  const hasAdmin = sources.some((source) => source.source_type === "행정해석");

  return [
    `- ${topic} 관련 규정, 계약서, 실제 운영 방식이 서로 다르면 분쟁 리스크가 커질 수 있습니다.`,
    "- 문서화된 기준과 실제 적용 사례가 다르면 근로감독, 부당해고, 임금체불, 차별 판단에서 불리하게 작용할 수 있습니다.",
    hasCases ? "- 관련 판례가 확인되므로 유사 사실관계와 회사 사안을 비교해야 합니다." : "- 관련 판례가 부족하여 추가 검색 또는 전문가 검토가 필요합니다.",
    hasAdmin ? "- 관련 행정해석은 행정기관 대응 방향을 정리하는 참고자료로 활용할 수 있습니다." : "- 관련 행정해석이 부족하여 감독 대응 자료는 별도 보강이 필요합니다."
  ].join("\n");
}

function buildActions(purpose: Purpose) {
  if (purpose === "임원 보고용") {
    return [
      "- 핵심 리스크, 예상 비용, 의사결정이 필요한 선택지를 1페이지 요약으로 별도 정리합니다.",
      "- 즉시 조치할 사항과 중장기 제도 개선 과제를 분리합니다.",
      "- 대외 분쟁 가능성이 있는 항목은 전문가 검토 일정과 책임자를 지정합니다."
    ].join("\n");
  }

  if (purpose === "근로감독 대응용") {
    return [
      "- 관련 규정, 근로계약서, 임금대장, 근태기록, 내부 승인 문서를 우선 확보합니다.",
      "- 실제 운영 현황과 문서상 기준이 다른 부분은 개선계획과 실행 일정을 만듭니다.",
      "- 감독관 질의 예상 항목별로 사실관계, 증빙, 시정계획을 매칭합니다."
    ].join("\n");
  }

  if (purpose === "직원 안내용") {
    return [
      "- 직원에게 안내할 내용은 쉬운 표현으로 정리하고 단정적인 법률판단은 피합니다.",
      "- 제도 운영 기준, 신청 방법, 문의 창구를 명확히 안내합니다.",
      "- 불이익 또는 분쟁 가능성이 있는 표현은 노무사 검토 후 배포합니다."
    ].join("\n");
  }

  return [
    "- 관련 규정과 실제 운영 내역을 대조해 쟁점별로 리스크 등급을 정리합니다.",
    "- 검색된 판례와 행정해석의 사실관계가 회사 상황과 얼마나 유사한지 비교합니다.",
    "- 보완이 필요한 문서, 절차, 커뮤니케이션 계획을 우선순위별로 실행합니다."
  ].join("\n");
}

function buildChecklist(topic: string, keywords: string[]) {
  const dynamicItems = keywordChecklist(topic, keywords);
  return uniqueStrings([
    "취업규칙 및 관련 인사규정",
    "근로계약서 및 임금 관련 약정",
    "임금대장, 근태기록, 수당 산정 자료",
    "내부 결재문서, 안내문, 직원 동의 또는 확인 자료",
    "최근 3년간 동일 쟁점 운영 사례",
    ...dynamicItems
  ])
    .map((item) => `- [ ] ${item}`)
    .join("\n");
}

function keywordChecklist(topic: string, keywords: string[]) {
  const text = `${topic} ${keywords.join(" ")}`;

  if (text.includes("포괄임금") || text.includes("연장근로")) {
    return ["고정OT 약정서", "실제 연장근로 기록", "근로시간 산정 가능성 검토표"];
  }

  if (text.includes("해고") || text.includes("징계")) {
    return ["징계사유 증빙", "소명기회 부여 자료", "인사위원회 회의록", "서면통지 문서"];
  }

  if (text.includes("연차")) {
    return ["연차 발생·사용 내역", "사용촉진 문서", "퇴직정산 내역"];
  }

  if (text.includes("파견")) {
    return ["도급·파견 계약서", "업무지시 체계 자료", "현장 지휘명령 실태 자료"];
  }

  return [];
}

function buildExpertReviewItems(topic: string) {
  return [
    `- ${topic}에 관한 회사 사실관계가 판례·행정해석의 사실관계와 실질적으로 유사한지`,
    "- 취업규칙, 근로계약서, 임금규정 등 문서 체계가 현재 운영과 일치하는지",
    "- 해고, 징계, 임금, 퇴직금, 파견, 근로시간 관련 법적 분쟁 가능성이 있는지",
    "- 근로감독 또는 분쟁 대응 시 제출할 증빙이 충분한지",
    "- 직원 안내 또는 제도 변경 시 추가 동의·협의 절차가 필요한지"
  ].join("\n");
}

function formatSourceSummary(index: number, source: ReportSource) {
  return [
    `#### ${index + 1}. ${compactText(source.title, 80, { ellipsis: false })}`,
    formatInfoTable([
      ["자료유형", source.source_type],
      ["기관/법원", source.institution || "-"],
      ["날짜", source.date || "-"],
      ["관련 법령", compactText(source.law || "-", 140, { ellipsis: false })]
    ]),
    "",
    "- 핵심 내용",
    ...toIndentedBullets(source.summary || "-", 2)
  ].join("\n");
}

function formatSourcesMarkdown(sources: ReportSource[]) {
  if (sources.length === 0) {
    return "관련 자료가 충분하지 않아 추가 검토가 필요합니다.";
  }

  return sources
    .map((source, index) =>
      [
        `${index + 1}. [${source.source_type}] ${source.title}`,
        `   - 날짜: ${source.date || "-"}`,
        `   - 기관/법원: ${source.institution || "-"}`,
        `   - 원문 URL: ${source.originalUrl || "-"}`
      ].join("\n")
    )
    .join("\n");
}

function formatInfoTable(rows: Array<[string, string]>) {
  return [
    "| 항목 | 내용 |",
    "| --- | --- |",
    ...rows.map(([label, value]) => `| ${label} | ${escapeTableCell(value || "-")} |`)
  ].join("\n");
}

function toIndentedBullets(value: string, indentLevel = 1, maxLength?: number) {
  const indent = "  ".repeat(indentLevel);
  const sentences = splitReadableSentences(value);
  return sentences.length > 0
    ? sentences.map((sentence) => `${indent}- ${maxLength ? compactText(sentence, maxLength, { ellipsis: false }) : sentence}`)
    : [`${indent}- -`];
}

function splitReadableSentences(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return [];
  }

  const sentenceMatches = normalized.match(/[^.!?。！？]+[.!?。！？]?/g) ?? [normalized];
  return sentenceMatches.map((sentence) => sentence.trim()).filter(Boolean);
}

function compactText(value: string, maxLength: number, options: { ellipsis?: boolean } = {}) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const sliced = normalized.slice(0, maxLength);
  const lastSpaceIndex = sliced.lastIndexOf(" ");
  const hasWordBreak = lastSpaceIndex >= Math.floor(maxLength * 0.6);
  const compacted = hasWordBreak ? sliced.slice(0, lastSpaceIndex) : sliced;

  return options.ellipsis === false ? compacted : `${compacted}...`;
}

function escapeTableCell(value: string) {
  return compactText(value, 180).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function getPurposeTone(purpose: Purpose) {
  if (purpose === "임원 보고용") {
    return "요약, 리스크, 의사결정 포인트를 중심으로 검토합니다.";
  }

  if (purpose === "근로감독 대응용") {
    return "준비자료, 증빙, 개선계획을 중심으로 검토합니다.";
  }

  if (purpose === "직원 안내용") {
    return "쉬운 표현을 사용하고 단정적 법률판단은 피하는 방향으로 검토합니다.";
  }

  return "상세 분석과 쟁점별 근거 정리를 중심으로 검토합니다.";
}

function scopeLabel(scope: Scope) {
  return SCOPE_OPTIONS.find((option) => option.value === scope)?.label ?? "판례 + 행정해석";
}

function isWithinDateRange(value: string, startDate: string, endDate: string) {
  const date = normalizeDate(value);
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);

  if (!date) {
    return true;
  }

  if (start && date < start) {
    return false;
  }

  if (end && date > end) {
    return false;
  }

  return true;
}

function normalizeDate(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 8 ? digits : "";
}

function dateValue(value: string) {
  const normalized = normalizeDate(value);

  if (!normalized) {
    return 0;
  }

  return Number(normalized);
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeLongText(value: string) {
  return value.replace(/\s+/g, " ").trim();
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
