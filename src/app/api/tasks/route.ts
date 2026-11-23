import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/auth";
import { isRealSheetDate, normalizeSheetDate } from "@/lib/dates";
import { taskErrorResponse } from "@/lib/routeErrors";
import { TaskValidationError } from "@/lib/taskErrors";
import { createTask, listTasksForDate } from "@/lib/taskRepository";
import { CreateTaskSchema, toTaskInput, validateTaskData } from "@/lib/validation";

export const dynamic = "force-dynamic";

function unauthorized(request: NextRequest) {
  const authError = requireApiKey(request);
  if (!authError) return null;
  return NextResponse.json(
    {
      error: authError.error,
      message: authError.message,
      hint: authError.hint,
    },
    { status: authError.status },
  );
}

/**
 * GET /api/tasks?date=11/24/2026
 * Public. Tasks are ordered by start time.
 */
export async function GET(request: NextRequest) {
  try {
    const raw = new URL(request.url).searchParams.get("date");
    if (!raw) {
      return NextResponse.json(
        { error: "Date parameter is required. Use: /api/tasks?date=11/24/2026" },
        { status: 400 },
      );
    }
    const date = normalizeSheetDate(raw);
    if (!isRealSheetDate(date)) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: "Date must be M/D/YYYY, for example 11/24/2026",
        },
        { status: 400 },
      );
    }

    const tasks = await listTasksForDate(date);
    return NextResponse.json(
      {
        success: true,
        date,
        tasks,
        count: tasks.length,
        ...(tasks.length === 0
          ? { message: "No tasks found for this date" }
          : {}),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return taskErrorResponse(error, "Failed to fetch tasks");
  }
}

/**
 * POST /api/tasks
 * Creates one task. Requires API_KEY.
 */
export async function POST(request: NextRequest) {
  const auth = unauthorized(request);
  if (auth) return auth;

  try {
    const body = await readJson(request);
    const validation = validateTaskData(CreateTaskSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error },
        { status: 400 },
      );
    }
    const task = await createTask(toTaskInput(validation.data));
    return NextResponse.json({ success: true, task }, { status: 201 });
  } catch (error) {
    return taskErrorResponse(error, "Failed to create task");
  }
}

async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new TaskValidationError("Request body must be JSON");
  }
}
