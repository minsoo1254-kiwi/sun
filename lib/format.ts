export function formatDate(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length !== 8) {
    return value || "-";
  }

  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
}

export function normalizeDateInput(value: string | null) {
  if (!value) {
    return "";
  }

  const digits = value.replace(/\D/g, "");
  return digits.length === 8 ? digits : "";
}

export function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}
