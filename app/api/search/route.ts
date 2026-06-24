import { NextResponse } from "next/server";

const EXTERNAL_SEARCH_URL = "https://api.example.com/search";

type ExternalApiError = {
  message?: string;
  error?: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword")?.trim();
  const apiKey = process.env.EXTERNAL_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { message: "EXTERNAL_API_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  if (!keyword) {
    return NextResponse.json(
      { message: "keyword 파라미터가 필요합니다." },
      { status: 400 }
    );
  }

  const externalUrl = new URL(EXTERNAL_SEARCH_URL);
  externalUrl.searchParams.set("keyword", keyword);

  try {
    const response = await fetch(externalUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          message: "외부 API 호출에 실패했습니다.",
          status: response.status,
          error: await readErrorMessage(response)
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ keyword, data });
  } catch (error) {
    return NextResponse.json(
      {
        message: "외부 API 호출 중 예외가 발생했습니다.",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 502 }
    );
  }
}

async function readErrorMessage(response: Response) {
  const fallback = response.statusText || "Unknown external API error";

  try {
    const payload = (await response.json()) as ExternalApiError;
    return payload.message || payload.error || fallback;
  } catch {
    return fallback;
  }
}
