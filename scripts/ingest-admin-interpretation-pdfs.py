import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import pdfplumber


KEYWORDS = [
    "연차",
    "연차촉진",
    "임금",
    "통상임금",
    "평균임금",
    "퇴직금",
    "퇴직급여",
    "퇴직연금",
    "해고",
    "징계",
    "수습",
    "근로시간",
    "연장근로",
    "휴일근로",
    "야간근로",
    "포괄임금",
    "기간제",
    "단시간",
    "비정규직",
    "파견",
    "불법파견",
    "취업규칙",
    "근로계약",
    "휴게",
    "휴일",
    "주휴",
    "최저임금",
    "임금채권",
    "체당금",
    "직장 내 괴롭힘",
    "산재",
]

LAW_BY_FILENAME = [
    ("퇴직급여", "근로자퇴직급여 보장법"),
    ("퇴직", "근로자퇴직급여 보장법"),
    ("파견", "파견근로자 보호 등에 관한 법률"),
    ("기간제", "기간제 및 단시간근로자 보호 등에 관한 법률"),
    ("비정규직", "기간제 및 단시간근로자 보호 등에 관한 법률"),
    ("임금채권", "임금채권보장법"),
    ("근로기준", "근로기준법"),
    ("노동관계", "노동관계법"),
]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--list", required=True, help="PowerShell-generated JSON file containing PDF names and paths")
    parser.add_argument("--output", required=True, help="Output admin-interpretations JSON path")
    parser.add_argument("--stats", required=True, help="Output ingestion stats JSON path")
    args = parser.parse_args()

    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    pdf_items = json.loads(Path(args.list).read_text(encoding="utf-8-sig"))
    now = datetime.now(timezone.utc).isoformat()
    records = []
    stats = []
    next_id = 1

    for item in pdf_items:
      pdf_path = Path(item["FullName"])
      file_name = item["Name"]
      law_name = infer_law_name(file_name)
      extracted_pages = 0
      empty_pages = 0
      failed_pages = 0

      with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)

        for page_index, page in enumerate(pdf.pages, start=1):
          try:
            raw_text = page.extract_text(x_tolerance=1, y_tolerance=3) or ""
          except Exception:
            raw_text = ""
            failed_pages += 1

          text = clean_text(raw_text)

          if len(text) < 30:
            empty_pages += 1
            continue

          extracted_pages += 1
          title = make_title(file_name, page_index, text)
          question, answer = split_question_answer(text)
          reply_date = extract_reply_date(text)
          records.append(
              {
                  "id": next_id,
                  "source_type": "고용노동부 질의회시집 PDF",
                  "title": title,
                  "law_name": law_name,
                  "article": extract_article(text),
                  "question": question,
                  "answer": answer,
                  "issue_keywords": ",".join(extract_keywords(text)),
                  "ministry": "고용노동부",
                  "department": "",
                  "reply_date": reply_date,
                  "source_url": "",
                  "file_name": file_name,
                  "page_no": page_index,
                  "created_at": now,
                  "updated_at": now,
              }
          )
          next_id += 1

      stats.append(
          {
              "file_name": file_name,
              "total_pages": total_pages,
              "extracted_pages": extracted_pages,
              "empty_or_scanned_pages": empty_pages,
              "failed_pages": failed_pages,
          }
      )
      print(f"{file_name}: {extracted_pages}/{total_pages} pages extracted")

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    stats_path = Path(args.stats)
    stats_path.parent.mkdir(parents=True, exist_ok=True)
    stats_path.write_text(json.dumps({"total_records": len(records), "files": stats}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"records={len(records)}")


def clean_text(value):
    value = value.replace("\u0000", " ")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def infer_law_name(file_name):
    for keyword, law_name in LAW_BY_FILENAME:
        if keyword in file_name:
            return law_name
    return "노동관계법"


def make_title(file_name, page_no, text):
    stem = Path(file_name).stem
    line = first_meaningful_line(text)
    suffix = f" - {line}" if line else ""
    title = f"{stem} p.{page_no}{suffix}"
    return title[:180]


def first_meaningful_line(text):
    ignored = ("www.", "Ministry", "고용노동부", "질의회시집", "목 차", "목차")
    for line in text.splitlines():
        candidate = line.strip(" -ㆍ•·\t")
        if len(candidate) < 4:
            continue
        if candidate.isdigit():
            continue
        if any(candidate.startswith(prefix) for prefix in ignored):
            continue
        return candidate
    return ""


def split_question_answer(text):
    markers = ["회시", "답변", "답", "검토의견"]
    for marker in markers:
        match = re.search(rf"(^|\n)\s*{marker}\s*[:：]?\s*", text)
        if match and match.start() > 20:
            question = text[: match.start()].strip()
            answer = text[match.end() :].strip()
            if len(answer) >= 20:
                return truncate(question, 3000), answer
    return "", text


def extract_reply_date(text):
    patterns = [
        r"(20\d{2}|19\d{2})[.\-/년]\s*(\d{1,2})[.\-/월]\s*(\d{1,2})",
        r"(20\d{2}|19\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            year, month, day = match.groups()
            return f"{int(year):04d}-{int(month):02d}-{int(day):02d}"
    return ""


def extract_article(text):
    matches = re.findall(r"제\s*\d+\s*조(?:의\s*\d+)?", text)
    normalized = []
    for match in matches:
        value = re.sub(r"\s+", "", match)
        if value not in normalized:
            normalized.append(value)
        if len(normalized) >= 5:
            break
    return ",".join(normalized)


def extract_keywords(text):
    found = [keyword for keyword in KEYWORDS if keyword in text]
    return found[:12]


def truncate(value, max_length):
    return value if len(value) <= max_length else value[:max_length].rstrip() + "..."


if __name__ == "__main__":
    main()
