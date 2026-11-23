import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { jsonError, sheetFailure, unauthorized } from "@/lib/routeErrors";
import { getTaskStore } from "@/lib/taskStore";
import { rangeError } from "@/lib/taskModel";
import { CreateTaskSchema, validateTaskData } from "@/lib/validation";

export const dynamic = "force-dynamic";

const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/;

/**
 * GET /api/tasks?date=M/D/YYYY
 * Public. Tasks are ordered by start time. Blocks without a start come last.
 */
export async function GET(request: NextRequest) {
  const date = new URL(request.url).searchParams.get("date");
  if (!date || !datePattern.test(date)) {
    return jsonError(
      400,
      "Date parameter is required. Use: /api/tasks?date=12/25/2024",
    );
  }

  try {
    const tasks = await getTaskStore().listByDate(date);
    return NextResponse.json({
      success: true,
      date,
      tasks,
      count: tasks.length,
    });
  } catch (error) {
    logger.error("Error fetching tasks:", error);
    return sheetFailure(error, "Failed to fetch tasks");
  }
}

/**
 * POST /api/tasks
 * Creates one task. Requires API_KEY.
 */
export async function POST(request: NextRequest) {
  const authError = unauthorized(request);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Validation failed", {
      details: "Request body must be JSON",
    });
  }

  const validation = validateTaskData(CreateTaskSchema, body);
  if (!validation.success) {
    return jsonError(400, "Validation failed", { details: validation.error });
  }

  const range = rangeError(validation.data.start, validation.data.end);
  if (range) {
    return jsonError(400, "Validation failed", { details: range });
  }

  try {
    const [task] = await getTaskStore().createMany([validation.data]);
    return NextResponse.json({ success: true, task }, { status: 201 });
  } catch (error) {
    logger.error("Error creating task:", error);
    return sheetFailure(error, "Failed to create task");
  }
}
