import type { AdminInterpretationSearchResult, ResultTypeFilter } from "@/types/admin-interpretation";
import type { CaseSearchItem } from "@/types/case";

export type UnifiedCaseSearchResult = CaseSearchItem & {
  type: "case";
  label: "판례";
  source: "법제처";
};

export type UnifiedSearchResult = UnifiedCaseSearchResult | AdminInterpretationSearchResult;

export type UnifiedSearchResponse = {
  keyword: string;
  type: ResultTypeFilter;
  page: number;
  caseTotalCount: number;
  caseDisplay: number;
  results: UnifiedSearchResult[];
  caseResults: UnifiedCaseSearchResult[];
  adminInterpretationResults: AdminInterpretationSearchResult[];
  errors: {
    cases?: string;
    adminInterpretations?: string;
  };
};
