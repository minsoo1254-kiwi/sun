import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import HighlightedText from "@/components/highlighted-text";
import RiskBadge from "@/components/risk-badge";
import { getCaseDetail } from "@/lib/law-api";
import { LawApiError } from "@/types/case";

const LEGAL_NOTICE =
  "본 서비스는 법제처 공개 API 기반 판례 검색 보조도구입니다. 제공되는 요약 및 체크포인트는 인사 실무 참고용이며, 구체적인 징계, 해고, 임금, 근로시간, 퇴직정산 판단은 반드시 노무사 또는 법률전문가 검토가 필요합니다.";

type CaseDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    lm?: string;
    LM?: string;
    q?: string;
    mask?: string;
    highlight?: string;
  }>;
};

export default async function CaseDetailPage({ params, searchParams }: CaseDetailPageProps) {
  const { id } = await params;
  const { lm, LM, q, mask, highlight } = await searchParams;
  const detailResult = await loadCaseDetail(id, lm ?? LM ?? "");
  const highlightQuery = q ?? "";
  const highlightMatches = (highlight === "1" || mask === "1") && highlightQuery.trim().length > 0;

  if ("message" in detailResult) {
    return (
      <main className="min-h-screen bg-[#f7f8fa]">
        <div className="mx-auto grid w-full max-w-3xl gap-5 px-6 py-12">
          <Link className="inline-flex items-center gap-2 text-sm font-bold text-[#3182f6] hover:text-[#1b64da]" href="/">
            <ArrowLeft aria-hidden="true" size={16} strokeWidth={2.2} />
            검색으로 돌아가기
          </Link>
          <section className="rounded-md border border-[#ffd6d6] bg-white p-6 shadow-panel">
            <h1 className="mb-2 text-xl font-bold text-[#191f28]">상세 조회 실패</h1>
            <p className="text-sm font-semibold text-[#f04452]">{detailResult.message}</p>
          </section>
        </div>
      </main>
    );
  }

  const detail = detailResult;

  return (
    <main className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-8">
        <div className="flex items-center justify-between pb-2">
          <Link className="inline-flex items-center gap-2 text-sm font-bold text-[#3182f6] hover:text-[#1b64da]" href="/">
            <ArrowLeft aria-hidden="true" size={16} strokeWidth={2.2} />
            검색으로 돌아가기
          </Link>
          <div className="flex items-center gap-2">
            <RiskBadge level={detail.checkpoints.riskLevel} />
          </div>
        </div>

        <section className="rounded-md border border-[#e5e8eb] bg-white p-6 shadow-panel">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="mb-2 text-sm font-bold text-[#8b95a1]">판례일련번호 {detail.serialNumber}</p>
              <h1 className="text-2xl font-bold tracking-normal text-[#191f28]">
                <HighlightedText enabled={highlightMatches} query={highlightQuery} value={detail.title || "판례 상세"} />
              </h1>
            </div>
            <dl className="grid min-w-80 grid-cols-2 gap-3 rounded-md border border-[#e5e8eb] bg-[#fbfcfd] p-4 text-sm">
              <Meta label="사건번호" value={detail.caseNumber} />
              <Meta label="법원명" value={detail.courtName} />
              <Meta label="선고일자" value={detail.decisionDate} />
              <Meta label="선고" value={detail.declaration} />
              <Meta label="판결유형" value={detail.judgmentType} />
              <Meta label="사건종류명" value={detail.caseTypeName} />
              <Meta label="법원종류코드" value={detail.courtTypeCode} />
              <Meta label="사건종류코드" value={detail.caseTypeCode} />
            </dl>
          </div>

          <div className="grid gap-5">
            <DetailSection
              highlightEnabled={highlightMatches}
              highlightQuery={highlightQuery}
              title="판시사항"
              value={detail.issues}
            />
            <DetailSection
              highlightEnabled={highlightMatches}
              highlightQuery={highlightQuery}
              title="판결요지"
              value={detail.summary}
            />
            <DetailSection
              highlightEnabled={highlightMatches}
              highlightQuery={highlightQuery}
              title="참조조문"
              value={detail.referenceStatutes}
            />
            <DetailSection
              highlightEnabled={highlightMatches}
              highlightQuery={highlightQuery}
              title="참조판례"
              value={detail.referenceCases}
            />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <aside className="h-fit rounded-md border border-[#e5e8eb] bg-white p-5 shadow-panel">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-[#191f28]">HR 실무 체크포인트</h2>
              <RiskBadge level={detail.checkpoints.riskLevel} />
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              {detail.checkpoints.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-[#e8f3ff] bg-[#f2f8ff] px-2.5 py-1 text-xs font-bold text-[#3182f6]"
                >
                  {tag}
                </span>
              ))}
            </div>

            <ul className="grid gap-3">
              {detail.checkpoints.checklist.map((item) => (
                <li key={item} className="rounded-md border border-[#e5e8eb] bg-[#fbfcfd] px-3 py-2 text-sm font-medium text-[#4e5968]">
                  {item}
                </li>
              ))}
            </ul>
          </aside>

          <article className="rounded-md border border-[#e5e8eb] bg-white p-6 shadow-panel">
            <h2 className="mb-4 text-base font-bold text-[#191f28]">판례내용</h2>
            <div className="content-text text-sm text-[#4e5968]">
              <HighlightedText
                enabled={highlightMatches}
                query={highlightQuery}
                value={detail.content || "상세 판례내용이 제공되지 않았습니다."}
              />
            </div>
          </article>
        </section>

        <section className="rounded-md border border-[#ffe6b8] bg-[#fff8e1] p-5 text-sm font-semibold leading-7 text-[#8a5b00]">
          {LEGAL_NOTICE}
        </section>
      </div>
    </main>
  );
}

async function loadCaseDetail(id: string, lm: string) {
  try {
    return await getCaseDetail(decodeURIComponent(id), lm);
  } catch (error) {
    return {
      message: error instanceof LawApiError ? error.message : "판례 API 호출 중 오류가 발생했습니다."
    };
  }
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="mb-1 text-xs font-bold text-[#8b95a1]">{label}</dt>
      <dd className="font-bold text-[#333d4b]">{value || "-"}</dd>
    </div>
  );
}

function DetailSection({
  title,
  value,
  highlightEnabled,
  highlightQuery
}: {
  title: string;
  value: string;
  highlightEnabled: boolean;
  highlightQuery: string;
}) {
  return (
    <section className="rounded-md border border-[#e5e8eb] p-4">
      <h2 className="mb-3 text-sm font-bold text-[#191f28]">{title}</h2>
      <div className="content-text text-sm text-[#4e5968]">
        <HighlightedText enabled={highlightEnabled} query={highlightQuery} value={value || "제공된 내용이 없습니다."} />
      </div>
    </section>
  );
}
