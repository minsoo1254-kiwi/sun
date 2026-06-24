import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  AdminInterpretation,
  AdminInterpretationInput,
  AdminInterpretationSearchResult,
  CsvUploadResult
} from "@/types/admin-interpretation";
import { sanitizeText, sanitizeTitle, sanitizeUrl } from "@/lib/security";

const DATA_FILE_PATH = path.join(process.cwd(), "data", "admin-interpretations.json");

const SEARCH_FIELDS: Array<keyof AdminInterpretation> = [
  "title",
  "law_name",
  "article",
  "question",
  "answer",
  "issue_keywords"
];

export class AdminInterpretationError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "AdminInterpretationError";
    this.code = code;
    this.status = status;
  }
}

export async function listAdminInterpretations() {
  const items = await readAdminInterpretations();
  return [...items].sort(compareByLatest);
}

export async function getAdminInterpretation(id: number) {
  assertValidId(id);
  const item = (await readAdminInterpretations()).find((entry) => entry.id === id);

  if (!item) {
    throw new AdminInterpretationError("NOT_FOUND", "행정해석을 찾을 수 없습니다.", 404);
  }

  return item;
}

export async function searchAdminInterpretations(keyword: string) {
  const normalizedKeyword = normalizeForSearch(keyword);

  if (!normalizedKeyword) {
    throw new AdminInterpretationError("MISSING_QUERY", "검색어를 입력해주세요.", 400);
  }

  const items = await readAdminInterpretations();

  return items
    .map((item) => ({ item, relevance: scoreInterpretation(item, normalizedKeyword) }))
    .filter(({ relevance }) => relevance > 0)
    .sort((a, b) => b.relevance - a.relevance || compareByLatest(a.item, b.item))
    .map(({ item, relevance }): AdminInterpretationSearchResult => ({
      ...item,
      type: "admin_interpretation",
      label: "행정해석",
      relevance,
      isSample: item.source_type.includes("샘플")
    }));
}

export async function createAdminInterpretation(input: AdminInterpretationInput) {
  const items = await readAdminInterpretations();
  const now = new Date().toISOString();
  const nextId = Math.max(0, ...items.map((item) => item.id)) + 1;
  const created = normalizeInput(input, {
    id: nextId,
    created_at: now,
    updated_at: now
  });

  await writeAdminInterpretations([...items, created]);
  return created;
}

export async function updateAdminInterpretation(id: number, input: AdminInterpretationInput) {
  assertValidId(id);
  const items = await readAdminInterpretations();
  const index = items.findIndex((entry) => entry.id === id);

  if (index === -1) {
    throw new AdminInterpretationError("NOT_FOUND", "행정해석을 찾을 수 없습니다.", 404);
  }

  const updated = normalizeInput(
    {
      ...items[index],
      ...input
    },
    {
      id,
      created_at: items[index].created_at,
      updated_at: new Date().toISOString()
    }
  );

  items[index] = updated;
  await writeAdminInterpretations(items);
  return updated;
}

export async function deleteAdminInterpretation(id: number) {
  assertValidId(id);
  const items = await readAdminInterpretations();
  const nextItems = items.filter((entry) => entry.id !== id);

  if (nextItems.length === items.length) {
    throw new AdminInterpretationError("NOT_FOUND", "행정해석을 찾을 수 없습니다.", 404);
  }

  await writeAdminInterpretations(nextItems);
}

export async function importAdminInterpretationsFromCsv(csvText: string): Promise<CsvUploadResult> {
  const rows = parseCsv(csvText);
  const [header = [], ...dataRows] = rows;
  const maxRows = 5000;
  const requiredColumns = [
    "source_type",
    "title",
    "law_name",
    "article",
    "question",
    "answer",
    "issue_keywords",
    "ministry",
    "department",
    "reply_date",
    "source_url",
    "file_name",
    "page_no"
  ];
  const normalizedHeader = header.map((column) => column.trim());
  const missingColumns = requiredColumns.filter((column) => !normalizedHeader.includes(column));

  if (missingColumns.length > 0) {
    throw new AdminInterpretationError(
      "MISSING_CSV_COLUMNS",
      `필수 컬럼이 누락되었습니다: ${missingColumns.join(", ")}`,
      400
    );
  }

  if (dataRows.length > maxRows) {
    throw new AdminInterpretationError("CSV_TOO_MANY_ROWS", `CSV 업로드는 최대 ${maxRows}행까지 가능합니다.`, 400);
  }

  const errors: CsvUploadResult["errors"] = [];
  let inserted = 0;

  for (let index = 0; index < dataRows.length; index += 1) {
    const row = dataRows[index];
    const rowNumber = index + 2;
    const record = Object.fromEntries(normalizedHeader.map((column, columnIndex) => [column, row[columnIndex] ?? ""]));
    const title = sanitizeTitle(record.title);
    const answer = sanitizeText(record.answer);

    if (!title || !answer) {
      errors.push({ row: rowNumber, message: "title과 answer는 필수값입니다." });
      continue;
    }

    await createAdminInterpretation({
      source_type: sanitizeText(record.source_type, 100),
      title,
      law_name: sanitizeText(record.law_name, 100),
      article: sanitizeText(record.article, 100),
      question: sanitizeText(record.question),
      answer,
      issue_keywords: sanitizeText(record.issue_keywords, 500),
      ministry: sanitizeText(record.ministry, 100),
      department: sanitizeText(record.department, 100),
      reply_date: sanitizeText(record.reply_date, 20),
      source_url: sanitizeUrl(record.source_url),
      file_name: sanitizeText(record.file_name, 255),
      page_no: toNullableNumber(record.page_no)
    });
    inserted += 1;
  }

  return { inserted, errors };
}

function normalizeInput(
  input: AdminInterpretationInput,
  systemFields: Pick<AdminInterpretation, "id" | "created_at" | "updated_at">
): AdminInterpretation {
  const title = sanitizeTitle(input.title);
  const answer = sanitizeText(input.answer);

  if (!title || !answer) {
    throw new AdminInterpretationError("VALIDATION_ERROR", "title과 answer는 필수값입니다.", 400);
  }

  return {
    id: systemFields.id,
    source_type: sanitizeText(input.source_type, 100) || "고용노동부 질의회시집",
    title,
    law_name: sanitizeText(input.law_name, 100),
    article: sanitizeText(input.article, 100),
    question: sanitizeText(input.question),
    answer,
    issue_keywords: sanitizeText(input.issue_keywords, 500),
    ministry: sanitizeText(input.ministry, 100) || "고용노동부",
    department: sanitizeText(input.department, 100),
    reply_date: sanitizeText(input.reply_date, 20),
    source_url: sanitizeUrl(input.source_url),
    file_name: sanitizeText(input.file_name, 255),
    page_no: toNullableNumber(input.page_no),
    created_at: systemFields.created_at,
    updated_at: systemFields.updated_at
  };
}

function assertValidId(id: number) {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new AdminInterpretationError("INVALID_ID", "잘못된 ID입니다.", 400);
  }
}

async function readAdminInterpretations(): Promise<AdminInterpretation[]> {
  try {
    const raw = await readFile(DATA_FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as AdminInterpretation[];
    return Array.isArray(parsed) ? parsed.map(normalizeStoredItem) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await writeAdminInterpretations([]);
      return [];
    }

    throw error;
  }
}

async function writeAdminInterpretations(items: AdminInterpretation[]) {
  await mkdir(path.dirname(DATA_FILE_PATH), { recursive: true });
  await writeFile(DATA_FILE_PATH, `${JSON.stringify(items, null, 2)}\n`, "utf8");
}

function normalizeStoredItem(item: AdminInterpretation): AdminInterpretation {
  return normalizeInput(item, {
    id: Number(item.id),
    created_at: item.created_at || new Date().toISOString(),
    updated_at: item.updated_at || item.created_at || new Date().toISOString()
  });
}

function scoreInterpretation(item: AdminInterpretation, keyword: string) {
  const title = normalizeForSearch(item.title);
  const keywords = normalizeForSearch(item.issue_keywords);
  const question = normalizeForSearch(item.question);
  const answer = normalizeForSearch(item.answer);

  let score = 0;

  if (title.includes(keyword)) {
    score += 100;
  }

  if (keywords.includes(keyword)) {
    score += 70;
  }

  if (question.includes(keyword)) {
    score += 40;
  }

  if (answer.includes(keyword)) {
    score += 40;
  }

  SEARCH_FIELDS.forEach((field) => {
    if (normalizeForSearch(String(item[field] ?? "")).includes(keyword)) {
      score += 10;
    }
  });

  return score;
}

function compareByLatest(a: AdminInterpretation, b: AdminInterpretation) {
  return dateValue(b.reply_date || b.updated_at) - dateValue(a.reply_date || a.updated_at);
}

function normalizeForSearch(value: string) {
  return value.trim().toLocaleLowerCase("ko-KR");
}

function dateValue(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseCsv(csvText: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index];
    const nextCharacter = csvText[index + 1];

    if (character === '"' && quoted && nextCharacter === '"') {
      field += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      quoted = !quoted;
      continue;
    }

    if (character === "," && !quoted) {
      row.push(field);
      field = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += character;
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((currentRow) => currentRow.some((cell) => cell.trim()));
}
