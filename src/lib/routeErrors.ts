import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "./auth";

export function jsonError(
  status: number,
  error: string,
  extra?: { details?: string; hint?: string; message?: string },
) {
  return NextResponse.json(
    {
      error,
      ...(extra?.message ? { message: extra.message } : {}),
      ...(extra?.details ? { details: extra.details } : {}),
      ...(extra?.hint ? { hint: extra.hint } : {}),
    },
    { status },
  );
}

export function unauthorized(request: NextRequest) {
  const authError = requireApiKey(request);
  if (!authError) return null;
  return jsonError(authError.status, authError.error, {
    message: authError.message,
    hint: authError.hint,
  });
}

export function isMissingTask(error: unknown): boolean {
  return error instanceof Error && error.message === "Task not found";
}

export function sheetFailure(error: unknown, fallback: string) {
  const details = error instanceof Error ? error.message : "Unknown error";
  const lower = details.toLowerCase();
  let hint: string | undefined;
  if (
    lower.includes("permission") ||
    lower.includes("access") ||
    lower.includes("403")
  ) {
    hint = "Share the spreadsheet with the service account email.";
  } else if (lower.includes("not found") || lower.includes("404")) {
    hint =
      "Check GOOGLE_SHEETS_SPREADSHEET_ID and GOOGLE_SHEETS_SHEET_NAME.";
  } else if (lower.includes("credential") || lower.includes("authenticate")) {
    hint = "Check the Google Sheets credentials in the environment.";
  } else if (lower.includes("spreadsheet id")) {
    hint = "Set GOOGLE_SHEETS_SPREADSHEET_ID.";
  }
  return jsonError(500, fallback, { details, hint });
}
