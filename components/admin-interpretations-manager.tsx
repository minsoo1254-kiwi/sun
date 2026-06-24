"use client";

import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";
import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, FileUp, Save, Trash2 } from "lucide-react";
import type { AdminInterpretation, AdminInterpretationInput, CsvUploadResult } from "@/types/admin-interpretation";

const EMPTY_FORM: AdminInterpretationInput = {
  source_type: "고용노동부 질의회시집",
  title: "",
  law_name: "",
  article: "",
  question: "",
  answer: "",
  issue_keywords: "",
  ministry: "고용노동부",
  department: "",
  reply_date: "",
  source_url: "",
  file_name: "",
  page_no: null
};

export default function AdminInterpretationsManager() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [items, setItems] = useState<AdminInterpretation[]>([]);
  const [form, setForm] = useState<AdminInterpretationInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetch("/api/admin/me", { credentials: "same-origin" })
        .then(async (response) => {
          if (!response.ok) {
            setAuthenticated(false);
            return;
          }

          setAuthenticated(true);
          const listResponse = await fetch("/api/admin-interpretations", {
            credentials: "same-origin"
          });
          const payload = (await listResponse.json()) as { items?: AdminInterpretation[]; message?: string };

          if (!listResponse.ok) {
            setMessage(payload.message ?? "행정해석 목록 조회에 실패했습니다.");
            return;
          }

          setItems(payload.items ?? []);
        })
        .catch(() => setAuthenticated(false));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/login", {
        body: JSON.stringify({ password }),
        credentials: "same-origin",
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(payload.message ?? "관리자 인증에 실패했습니다.");
        return;
      }

      setPassword("");
      setAuthenticated(true);
      await loadItems();
    } catch {
      setMessage("관리자 인증에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
    setMessage("");

    try {
      await fetch("/api/admin/logout", {
        credentials: "same-origin",
        method: "POST"
      });
      setAuthenticated(false);
      setItems([]);
      setForm(EMPTY_FORM);
      setEditingId(null);
      setMessage("로그아웃했습니다.");
    } catch {
      setMessage("로그아웃에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function loadItems() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin-interpretations", {
        credentials: "same-origin"
      });
      const payload = (await response.json()) as { items?: AdminInterpretation[]; message?: string };

      if (!response.ok) {
        setAuthenticated(false);
        setMessage(payload.message ?? "행정해석 목록 조회에 실패했습니다.");
        return;
      }

      setAuthenticated(true);
      setItems(payload.items ?? []);
    } catch {
      setMessage("행정해석 목록 조회에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const url = editingId ? `/api/admin-interpretations/${editingId}` : "/api/admin-interpretations";
    const method = editingId ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        credentials: "same-origin",
        method,
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(form)
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(payload.message ?? "저장에 실패했습니다.");
        return;
      }

      setForm(EMPTY_FORM);
      setEditingId(null);
      setMessage(editingId ? "행정해석을 수정했습니다." : "행정해석을 등록했습니다.");
      await loadItems();
    } catch {
      setMessage("저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteItem(id: number) {
    if (!window.confirm("이 행정해석을 삭제할까요?")) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin-interpretations/${id}`, {
        credentials: "same-origin",
        method: "DELETE"
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(payload.message ?? "삭제에 실패했습니다.");
        return;
      }

      setMessage("행정해석을 삭제했습니다.");
      await loadItems();
    } catch {
      setMessage("삭제에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function uploadCsv(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!csvFile) {
      setMessage("CSV 파일을 선택해주세요.");
      return;
    }

    const formData = new FormData();
    formData.append("file", csvFile);
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin-interpretations/upload-csv", {
        credentials: "same-origin",
        method: "POST",
        body: formData
      });
      const payload = (await response.json()) as CsvUploadResult & { message?: string };

      if (!response.ok) {
        setMessage(payload.message ?? "CSV 업로드에 실패했습니다.");
        return;
      }

      const errorText =
        payload.errors.length > 0
          ? ` 오류 ${payload.errors.length}건: ${payload.errors.map((error) => `${error.row}행 ${error.message}`).join(", ")}`
          : "";
      setMessage(`CSV 업로드 완료: ${payload.inserted}건 등록.${errorText}`);
      setCsvFile(null);
      await loadItems();
    } catch {
      setMessage("CSV 업로드에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function editItem(item: AdminInterpretation) {
    setEditingId(item.id);
    setForm({
      source_type: item.source_type,
      title: item.title,
      law_name: item.law_name,
      article: item.article,
      question: item.question,
      answer: item.answer,
      issue_keywords: item.issue_keywords,
      ministry: item.ministry,
      department: item.department,
      reply_date: item.reply_date,
      source_url: item.source_url,
      file_name: item.file_name,
      page_no: item.page_no
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto grid w-full max-w-7xl gap-5 px-6 py-8">
        <header className="flex items-end justify-between gap-5 pb-3">
          <div>
            <Link className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-[#3182f6]" href="/">
              <ArrowLeft aria-hidden="true" size={16} strokeWidth={2.2} />
              통합 검색으로 돌아가기
            </Link>
            <h1 className="text-3xl font-bold tracking-normal text-[#191f28]">행정해석 관리자</h1>
          </div>
          <div className="rounded-md border border-[#e5e8eb] bg-white px-4 py-3 text-sm font-medium text-[#6b7684] shadow-panel">
            ADMIN_PASSWORD 기반 접근
          </div>
        </header>

        <section className="rounded-md border border-[#e5e8eb] bg-white p-5 shadow-panel">
          <form className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={login}>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-[#4e5968]">관리자 비밀번호</span>
              <input
                className="h-11 rounded-md border border-[#d1d6db] bg-[#fbfcfd] px-3 text-sm text-[#191f28] outline-none transition focus:border-[#3182f6] focus:bg-white focus:ring-2 focus:ring-[#e8f3ff]"
                onChange={(event) => setPassword(event.target.value)}
                placeholder=".env.local의 ADMIN_PASSWORD"
                type="password"
                value={password}
              />
            </label>
            <button
              className="mt-auto h-11 rounded-md bg-[#3182f6] px-4 text-sm font-bold text-white transition hover:bg-[#1b64da] disabled:bg-[#b0b8c1]"
              disabled={loading || !password}
              type="submit"
            >
              로그인
            </button>
          </form>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[#6b7684]">
              {authenticated ? "관리자 세션이 활성화되어 있습니다." : "로그인 후 행정해석 데이터를 관리할 수 있습니다."}
            </p>
            {authenticated ? (
              <button
                className="h-9 rounded-md border border-[#d1d6db] bg-white px-3 text-sm font-bold text-[#4e5968] transition hover:bg-[#f2f4f6]"
                disabled={loading}
                onClick={() => void logout()}
                type="button"
              >
                로그아웃
              </button>
            ) : null}
          </div>
          {message ? <p className="mt-3 text-sm font-semibold text-[#f04452]">{message}</p> : null}
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_420px]">
          <form className="rounded-md border border-[#e5e8eb] bg-white p-5 shadow-panel" onSubmit={saveItem}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#191f28]">{editingId ? "행정해석 수정" : "행정해석 등록"}</h2>
              {editingId ? (
                <button
                  className="text-sm font-bold text-[#8b95a1] hover:text-[#191f28]"
                  onClick={() => {
                    setEditingId(null);
                    setForm(EMPTY_FORM);
                  }}
                  type="button"
                >
                  새 등록으로 전환
                </button>
              ) : null}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <TextField label="제목*" name="title" onChange={setForm} value={form.title} />
              <TextField label="자료 유형" name="source_type" onChange={setForm} value={form.source_type ?? ""} />
              <TextField label="관련 법령" name="law_name" onChange={setForm} value={form.law_name ?? ""} />
              <TextField label="관련 조문" name="article" onChange={setForm} value={form.article ?? ""} />
              <TextField label="기관명" name="ministry" onChange={setForm} value={form.ministry ?? ""} />
              <TextField label="담당 부서" name="department" onChange={setForm} value={form.department ?? ""} />
              <TextField label="회시일" name="reply_date" onChange={setForm} type="date" value={form.reply_date ?? ""} />
              <TextField label="페이지 번호" name="page_no" onChange={setForm} type="number" value={String(form.page_no ?? "")} />
              <TextField label="원문 URL" name="source_url" onChange={setForm} value={form.source_url ?? ""} />
              <TextField label="원본 파일명" name="file_name" onChange={setForm} value={form.file_name ?? ""} />
            </div>
            <TextArea label="검색 키워드" name="issue_keywords" onChange={setForm} value={form.issue_keywords ?? ""} />
            <TextArea label="질의 내용" name="question" onChange={setForm} value={form.question ?? ""} />
            <TextArea label="회시 내용*" name="answer" onChange={setForm} value={form.answer} />
            <button
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-[#3182f6] px-4 text-sm font-bold text-white transition hover:bg-[#1b64da] disabled:bg-[#b0b8c1]"
              disabled={loading || !authenticated}
              type="submit"
            >
              <Save aria-hidden="true" size={16} strokeWidth={2.2} />
              저장
            </button>
          </form>

          <form className="h-fit rounded-md border border-[#e5e8eb] bg-white p-5 shadow-panel" onSubmit={uploadCsv}>
            <h2 className="mb-3 text-lg font-bold text-[#191f28]">CSV 업로드</h2>
            <p className="mb-4 text-sm leading-6 text-[#6b7684]">
              컬럼: source_type,title,law_name,article,question,answer,issue_keywords,ministry,department,reply_date,source_url,file_name,page_no
            </p>
            <input
              accept=".csv,text/csv"
              className="block w-full rounded-md border border-[#d1d6db] bg-[#fbfcfd] px-3 py-2 text-sm text-[#4e5968]"
              onChange={(event) => setCsvFile(event.target.files?.[0] ?? null)}
              type="file"
            />
            <button
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-md border border-[#d1d6db] bg-white px-4 text-sm font-bold text-[#4e5968] transition hover:bg-[#f2f4f6] disabled:opacity-40"
              disabled={loading || !authenticated}
              type="submit"
            >
              <FileUp aria-hidden="true" size={16} strokeWidth={2.2} />
              업로드
            </button>
          </form>
        </section>

        <section className="rounded-md border border-[#e5e8eb] bg-white shadow-panel">
          <div className="border-b border-[#e5e8eb] px-5 py-4">
            <h2 className="text-lg font-bold text-[#191f28]">행정해석 목록</h2>
            <p className="mt-1 text-sm font-medium text-[#8b95a1]">총 {items.length.toLocaleString("ko-KR")}건</p>
          </div>
          <div className="divide-y divide-[#f2f4f6]">
            {items.map((item) => (
              <article className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto]" key={item.id}>
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded bg-[#f2f4f6] px-2 py-1 text-xs font-bold text-[#4e5968]">{item.source_type}</span>
                    <span className="text-xs font-bold text-[#8b95a1]">#{item.id}</span>
                  </div>
                  <h3 className="font-bold text-[#191f28]">{item.title}</h3>
                  <p className="mt-1 text-sm text-[#6b7684]">
                    {item.law_name || "-"} · {item.article || "-"} · {item.reply_date || "회시일 없음"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="h-9 rounded-md border border-[#d1d6db] bg-white px-3 text-sm font-bold text-[#4e5968] hover:bg-[#f2f4f6]"
                    onClick={() => editItem(item)}
                    type="button"
                  >
                    수정
                  </button>
                  <button
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-[#ffd6d6] bg-white px-3 text-sm font-bold text-[#f04452] hover:bg-[#fff1f1]"
                    onClick={() => void deleteItem(item.id)}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" size={15} strokeWidth={2.2} />
                    삭제
                  </button>
                </div>
              </article>
            ))}
            {items.length === 0 ? (
              <div className="px-5 py-14 text-center text-sm font-medium text-[#8b95a1]">등록된 행정해석이 없습니다.</div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function TextField({
  label,
  name,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  name: keyof AdminInterpretationInput;
  value: string;
  onChange: Dispatch<SetStateAction<AdminInterpretationInput>>;
  type?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold text-[#4e5968]">{label}</span>
      <input
        className="h-10 rounded-md border border-[#d1d6db] bg-[#fbfcfd] px-3 text-sm text-[#191f28] outline-none transition focus:border-[#3182f6] focus:bg-white focus:ring-2 focus:ring-[#e8f3ff]"
        onChange={(event) =>
          onChange((currentForm) => ({
            ...currentForm,
            [name]: type === "number" ? Number(event.target.value) || null : event.target.value
          }))
        }
        type={type}
        value={value}
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  value,
  onChange
}: {
  label: string;
  name: keyof AdminInterpretationInput;
  value: string;
  onChange: Dispatch<SetStateAction<AdminInterpretationInput>>;
}) {
  return (
    <label className="mt-3 grid gap-2">
      <span className="text-sm font-bold text-[#4e5968]">{label}</span>
      <textarea
        className="min-h-24 rounded-md border border-[#d1d6db] bg-[#fbfcfd] px-3 py-2 text-sm text-[#191f28] outline-none transition focus:border-[#3182f6] focus:bg-white focus:ring-2 focus:ring-[#e8f3ff]"
        onChange={(event) =>
          onChange((currentForm) => ({
            ...currentForm,
            [name]: event.target.value
          }))
        }
        value={value}
      />
    </label>
  );
}
