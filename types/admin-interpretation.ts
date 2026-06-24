export type ResultTypeFilter = "all" | "case" | "admin_interpretation";

export type AdminInterpretationInput = {
  source_type?: string;
  title: string;
  law_name?: string;
  article?: string;
  question?: string;
  answer: string;
  issue_keywords?: string;
  ministry?: string;
  department?: string;
  reply_date?: string;
  source_url?: string;
  file_name?: string;
  page_no?: number | null;
};

export type AdminInterpretation = AdminInterpretationInput & {
  id: number;
  source_type: string;
  law_name: string;
  article: string;
  question: string;
  issue_keywords: string;
  ministry: string;
  department: string;
  reply_date: string;
  source_url: string;
  file_name: string;
  page_no: number | null;
  created_at: string;
  updated_at: string;
};

export type AdminInterpretationSearchResult = AdminInterpretation & {
  label: "행정해석";
  type: "admin_interpretation";
  relevance: number;
  isSample: boolean;
};

export type CsvUploadResult = {
  inserted: number;
  errors: Array<{
    row: number;
    message: string;
  }>;
};
