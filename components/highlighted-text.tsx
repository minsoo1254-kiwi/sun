type HighlightedTextProps = {
  value: string;
  query: string;
  enabled?: boolean;
};

export default function HighlightedText({ value, query, enabled = false }: HighlightedTextProps) {
  if (!enabled || !value) {
    return <>{value}</>;
  }

  const terms = getHighlightTerms(query);

  if (terms.length === 0) {
    return <>{value}</>;
  }

  const matcher = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
  const parts = value.split(matcher);

  return (
    <>
      {parts.map((part, index) => {
        if (!part) {
          return null;
        }

        const isMatch = terms.some((term) => part.toLocaleLowerCase("ko-KR") === term.toLocaleLowerCase("ko-KR"));

        if (!isMatch) {
          return <span key={`${part}-${index}`}>{part}</span>;
        }

        return (
          <mark
            className="rounded bg-[#fff6bf] px-1 font-bold text-[#191f28] ring-1 ring-[#ffd43b]/70"
            key={`${part}-${index}`}
          >
            {part}
          </mark>
        );
      })}
    </>
  );
}

function getHighlightTerms(query: string) {
  const normalized = query.trim().replace(/\s+/g, " ");

  if (!normalized) {
    return [];
  }

  const terms = [normalized, ...normalized.split(" ")]
    .map((term) => term.trim())
    .filter((term) => term.length > 0);

  return Array.from(new Set(terms)).sort((a, b) => b.length - a.length);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
