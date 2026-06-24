import { NextResponse } from "next/server";
import { AdminAuthError } from "@/lib/admin-auth";
import { AdminInterpretationError } from "@/lib/admin-interpretations-store";
import { RateLimitError } from "@/lib/rate-limit";
import { SecurityValidationError } from "@/lib/security";
import { LawApiError } from "@/types/case";

export function apiErrorResponse(error: unknown, fallbackMessage: string) {
  if (
    error instanceof AdminAuthError ||
    error instanceof AdminInterpretationError ||
    error instanceof LawApiError ||
    error instanceof RateLimitError ||
    error instanceof SecurityValidationError
  ) {
    if (error.status >= 500 && process.env.NODE_ENV === "production") {
      return NextResponse.json({ message: fallbackMessage, code: "INTERNAL_ERROR" }, { status: 500 });
    }

    return NextResponse.json({ message: error.message, code: error.code }, { status: error.status });
  }

  return NextResponse.json({ message: fallbackMessage, code: "INTERNAL_ERROR" }, { status: 500 });
}
