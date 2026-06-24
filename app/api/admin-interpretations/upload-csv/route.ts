import { NextResponse } from "next/server";
import { assertAdminAuthorized } from "@/lib/admin-auth";
import { apiErrorResponse } from "@/lib/api-error-response";
import { importAdminInterpretationsFromCsv } from "@/lib/admin-interpretations-store";
import { assertRateLimit, getClientIp } from "@/lib/rate-limit";
import { assertCsvTextSize, assertSameOrigin, validateCsvFile } from "@/lib/security";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    assertAdminAuthorized(request);
    assertRateLimit(`csv-upload:${getClientIp(request)}`, 3, 10 * 60 * 1000);
    const contentType = request.headers.get("content-type") ?? "";
    let csvText = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return NextResponse.json({ message: "CSV 파일을 선택해주세요.", code: "MISSING_FILE" }, { status: 400 });
      }

      validateCsvFile(file);
      csvText = await file.text();
    } else {
      csvText = await request.text();
    }

    assertCsvTextSize(csvText);
    const result = await importAdminInterpretationsFromCsv(csvText);
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error, "CSV 업로드에 실패했습니다.");
  }
}
