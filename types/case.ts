export type CaseSearchRange = "1" | "2";

export type CaseSummary = {
  id: string;
  title: string;
  caseNumber: string;
  courtName: string;
  decisionDate: string;
  declaration: string;
  courtTypeCode: string;
  caseTypeName: string;
  caseTypeCode: string;
  judgmentType: string;
  serialNumber: string;
  sourceName: string;
  detailLink: string;
};

export type CaseDetail = CaseSummary & {
  issues: string;
  summary: string;
  referenceStatutes: string;
  referenceCases: string;
  content: string;
  checkpoints: HrCheckpointResult;
};

export type CaseSearchItem = CaseSummary & {
  issues: string;
  summary: string;
  contentPreview: string;
  checkpoints: HrCheckpointResult | null;
  detailStatus: "loaded" | "unavailable";
  detailMessage: string;
};

export type HrCheckpointResult = {
  riskLevel: "낮음" | "보통" | "높음";
  tags: string[];
  checklist: string[];
};

export type SearchCasesResponse = {
  items: CaseSearchItem[];
  totalCount: number;
  page: number;
  display: number;
};

export type LawApiErrorCode =
  | "MISSING_QUERY"
  | "MISSING_API_KEY"
  | "LAW_API_ERROR"
  | "NOT_FOUND";

export class LawApiError extends Error {
  code: LawApiErrorCode;
  status: number;

  constructor(code: LawApiErrorCode, message: string, status = 500) {
    super(message);
    this.name = "LawApiError";
    this.code = code;
    this.status = status;
  }
}
