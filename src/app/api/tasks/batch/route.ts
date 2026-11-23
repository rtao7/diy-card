import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/auth";
import { taskErrorResponse } from "@/lib/routeErrors";
import { TaskValidationError } from "@/lib/taskErrors";
import { createTasks } from "@/lib/taskRepository";
import {
  BatchCreateSchema,
  toTaskInput,
  validateTaskData,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * POST /api/tasks/batch
 * Creates every block for one date. Requires API_KEY.
 *
 * Body: { date: "11/24/2026", tasks: [{ text, start?, end?, status?, first_step?, done_means? }] }
 */
export async function POST(request: NextRequest) {
  const authError = requireApiKey(request);
  if (authError) {
    return NextResponse.json(
      {
        error: authError.error,
        message: authError.message,
        hint: authError.hint,
      },
      { status: authError.status },
    );
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new TaskValidationError("Request body must be JSON");
    }

    const validation = validateTaskData(BatchCreateSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error },
        { status: 400 },
      );
    }

    const { date, tasks: inputs } = validation.data;
    const tasks = await createTasks(
      date,
      inputs.map((input) => toTaskInput({ ...input, date })),
    );

    return NextResponse.json(
      { success: true, date, count: tasks.length, tasks },
      { status: 201 },
    );
  } catch (error) {
    return taskErrorResponse(error, "Failed to create tasks");
  }
}
