import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { jsonError, sheetFailure, unauthorized } from "@/lib/routeErrors";
import { getTaskStore } from "@/lib/taskStore";
import { rangeError, TaskInput } from "@/lib/taskModel";
import { BatchCreateSchema, validateTaskData } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * POST /api/tasks/batch
 * Creates several tasks for one date. Requires API_KEY.
 *
 * Body: { date: "M/D/YYYY", tasks: [{ text, start?, end?, first_step?, done_means?, status? }] }
 * A task may set its own date; otherwise it uses the batch date.
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

  const validation = validateTaskData(BatchCreateSchema, body);
  if (!validation.success) {
    return jsonError(400, "Validation failed", { details: validation.error });
  }

  const inputs: TaskInput[] = validation.data.tasks.map((task) => ({
    date: task.date ?? validation.data.date,
    text: task.text,
    completed: task.completed,
    status: task.status,
    start: task.start,
    end: task.end,
    first_step: task.first_step,
    done_means: task.done_means,
  }));

  for (const input of inputs) {
    const range = rangeError(input.start, input.end);
    if (range) {
      return jsonError(400, "Validation failed", {
        details: `${input.text}: ${range}`,
      });
    }
  }

  try {
    const tasks = await getTaskStore().createMany(inputs);
    return NextResponse.json(
      {
        success: true,
        date: validation.data.date,
        tasks,
        count: tasks.length,
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Error creating tasks:", error);
    return sheetFailure(error, "Failed to create tasks");
  }
}
