import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/auth";
import { taskErrorResponse } from "@/lib/routeErrors";
import { TaskValidationError } from "@/lib/taskErrors";
import { updateTaskRecord } from "@/lib/taskRepository";
import { StatusUpdateSchema, validateTaskData } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/tasks/:id/status
 * Body: { "status": "pending" | "done" | "slipped" }
 * Requires API_KEY.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new TaskValidationError("Request body must be JSON");
    }

    const validation = validateTaskData(StatusUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error },
        { status: 400 },
      );
    }

    const task = await updateTaskRecord(id, { status: validation.data.status });
    return NextResponse.json({ success: true, task });
  } catch (error) {
    return taskErrorResponse(error, "Failed to update status");
  }
}
