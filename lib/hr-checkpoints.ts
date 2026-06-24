import type { HrCheckpointResult } from "@/types/case";

type Rule = {
  tags: string[];
  keywords: string[];
  checklist: string[];
  riskWeight: number;
};

const RULES: Rule[] = [
  {
    tags: ["수습", "본채용 거부"],
    keywords: ["수습", "본채용", "본채용 거부", "시용", "채용거부"],
    checklist: ["평가기준 사전고지", "평가표", "면담기록", "개선기회", "노무사 검토 필요"],
    riskWeight: 2
  },
  {
    tags: ["연차", "유급휴가"],
    keywords: ["연차", "유급휴가", "휴가", "사용촉진"],
    checklist: ["입사일/회계연도 기준", "사용촉진", "잔여연차", "퇴사정산 확인"],
    riskWeight: 1
  },
  {
    tags: ["통상임금", "평균임금"],
    keywords: ["통상임금", "평균임금", "임금", "수당", "상여금"],
    checklist: ["정기성", "일률성", "고정성", "임금명세서", "수당 산입 여부 확인"],
    riskWeight: 2
  },
  {
    tags: ["해고", "징계"],
    keywords: ["해고", "징계", "부당해고", "정직", "감봉", "인사위원회"],
    checklist: ["취업규칙", "징계사유", "징계절차", "소명기회", "인사위원회 확인"],
    riskWeight: 3
  },
  {
    tags: ["포괄임금", "연장근로"],
    keywords: ["포괄임금", "연장근로", "고정OT", "고정오티", "근로시간", "임금체불"],
    checklist: ["근로시간 산정 가능성", "고정OT", "연장근로 기록", "임금체불 리스크 확인"],
    riskWeight: 3
  },
  {
    tags: ["퇴직금", "퇴직연금"],
    keywords: ["퇴직금", "퇴직연금", "계속근로", "DC", "DB", "퇴직정산"],
    checklist: ["계속근로기간", "평균임금", "DC/DB형", "퇴직정산 확인"],
    riskWeight: 2
  }
];

export function createHrCheckpoints(sourceText: string): HrCheckpointResult {
  const compactText = sourceText.replace(/\s+/g, " ").toLowerCase();
  const matchedRules = RULES.filter((rule) =>
    rule.keywords.some((keyword) => compactText.includes(keyword.toLowerCase()))
  );

  const tags = unique(matchedRules.flatMap((rule) => rule.tags));
  const checklist = unique(matchedRules.flatMap((rule) => rule.checklist));
  const riskScore = matchedRules.reduce((sum, rule) => sum + rule.riskWeight, 0);

  return {
    riskLevel: riskScore >= 5 ? "높음" : riskScore >= 2 ? "보통" : "낮음",
    tags: tags.length > 0 ? tags : ["일반 HR 판례"],
    checklist:
      checklist.length > 0
        ? checklist
        : ["사실관계", "사내 규정", "관련 증빙", "전문가 검토 필요 여부 확인"]
  };
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}
