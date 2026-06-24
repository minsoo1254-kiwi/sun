const FORMULA_PREFIXES = ["=", "+", "-", "@"];
const MAX_TEXT_LENGTH = 20000;
const MAX_TITLE_LENGTH = 300;
const MAX_KEYWORD_LENGTH = 100;
const MAX_PAGE = 1000;

export class SecurityValidationError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "SecurityValidationError";
    this.code = code;
    this.status = status;
  }
}

export function sanitizeText(value: unknown, maxLength = MAX_TEXT_LENGTH) {
  const normalized = String(value ?? "")
    .replace(/\u0000/g, "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "")
    .trim();

  return escapeCsvFormula(normalized).slice(0, maxLength);
}

export function sanitizeTitle(value: unknown) {
  return sanitizeText(value, MAX_TITLE_LENGTH);
}

export function sanitizeUrl(value: unknown) {
  const raw = sanitizeText(value, 2048);

  if (!raw) {
    return "";
  }

  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export function normalizeKeyword(value: unknown) {
  const keyword = sanitizeText(value, MAX_KEYWORD_LENGTH).replace(/\s+/g, " ").trim();

  if (!keyword) {
    throw new SecurityValidationError("MISSING_QUERY", "검색어를 입력해주세요.", 400);
  }

  return keyword;
}

export function parsePositiveId(value: string) {
  if (!/^\d+$/.test(value)) {
    throw new SecurityValidationError("INVALID_ID", "잘못된 ID입니다.", 400);
  }

  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new SecurityValidationError("INVALID_ID", "잘못된 ID입니다.", 400);
  }

  return id;
}

export function parsePage(value: string | null) {
  const page = Number(value ?? "1");

  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }

  return Math.min(Math.floor(page), MAX_PAGE);
}

export function assertSameOrigin(request: Request) {
  const method = request.method.toUpperCase();

  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return;
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (!origin && !referer) {
    throw new SecurityValidationError("CSRF_BLOCKED", "요청 출처를 확인할 수 없습니다.", 403);
  }

  const allowedOrigins = getAllowedOrigins(request);
  const requestOrigin = origin || (referer ? new URL(referer).origin : "");

  if (!allowedOrigins.has(requestOrigin)) {
    throw new SecurityValidationError("CSRF_BLOCKED", "허용되지 않은 요청 출처입니다.", 403);
  }
}

export function validateCsvFile(file: File) {
  const maxBytes = 5 * 1024 * 1024;
  const safeName = sanitizeText(file.name, 255).toLocaleLowerCase("ko-KR");
  const allowedTypes = new Set(["text/csv", "application/csv", "application/vnd.ms-excel", ""]);

  if (!safeName.endsWith(".csv")) {
    throw new SecurityValidationError("INVALID_FILE_TYPE", "CSV 파일만 업로드할 수 있습니다.", 400);
  }

  if (!allowedTypes.has(file.type)) {
    throw new SecurityValidationError("INVALID_FILE_TYPE", "CSV MIME Type이 올바르지 않습니다.", 400);
  }

  if (file.size > maxBytes) {
    throw new SecurityValidationError("FILE_TOO_LARGE", "CSV 파일은 5MB 이하만 업로드할 수 있습니다.", 400);
  }
}

export function assertCsvTextSize(csvText: string) {
  if (csvText.length > 5 * 1024 * 1024) {
    throw new SecurityValidationError("FILE_TOO_LARGE", "CSV 파일은 5MB 이하만 업로드할 수 있습니다.", 400);
  }
}

function escapeCsvFormula(value: string) {
  const trimmedStart = value.trimStart();

  if (FORMULA_PREFIXES.some((prefix) => trimmedStart.startsWith(prefix))) {
    return `'${value}`;
  }

  return value;
}

function getAllowedOrigins(request: Request) {
  const configured = process.env.ALLOWED_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [];
  const host = request.headers.get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

  if (host) {
    configured.push(`${protocol}://${host}`);
  }

  configured.push("http://localhost:3000", "http://127.0.0.1:3000");
  return new Set(configured);
}
