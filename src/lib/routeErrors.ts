import { NextResponse } from "next/server";
import {
  SheetAccessError,
  TaskNotFoundError,
  TaskValidationError,
} from "./taskErrors";
import { logger } from "./logger";

export function taskErrorResponse(error: unknown, fallback: string) {
  if (error instanceof TaskValidationError) {
    return NextResponse.json(
      { error: "Validation failed", details: error.message },
      { status: 400 },
    );
  }
  if (error instanceof TaskNotFoundError) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  if (error instanceof SheetAccessError) {
    return NextResponse.json(
      {
        error: fallback,
        details: error.message,
        hint: error.hint,
      },
      { status: 500 },
    );
  }

  logger.error(fallback, error);
  return NextResponse.json(
    {
      error: fallback,
      details: error instanceof Error ? error.message : "Unknown error",
    },
    { status: 500 },
  );
}
