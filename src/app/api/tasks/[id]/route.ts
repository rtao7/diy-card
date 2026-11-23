import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/auth";
import { taskErrorResponse } from "@/lib/routeErrors";
import { TaskValidationError } from "@/lib/taskErrors";
import { deleteTaskRecord, updateTaskRecord } from "@/lib/taskRepository";
import { toTaskPatch, UpdateTaskSchema, validateTaskData } from "@/lib/validation";

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
 * PATCH /api/tasks/:id
 * Partial update. Requires API_KEY.
 * Sending `status` is preferred. `completed: true` still maps to done,
 * and `completed: false` maps to pending.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = unauthorized(request);
  if (auth) return auth;

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

    const validation = validateTaskData(UpdateTaskSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error },
        { status: 400 },
      );
    }

    const patch = toTaskPatch(validation.data);
    if (Object.values(patch).every((value) => value === undefined)) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: "Provide at least one field to update",
        },
        { status: 400 },
      );
    }

    const task = await updateTaskRecord(id, patch);
    return NextResponse.json({ success: true, task });
  } catch (error) {
    return taskErrorResponse(error, "Failed to update task");
  }
}

/**
 * DELETE /api/tasks/:id
 * Requires API_KEY.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = unauthorized(request);
  if (auth) return auth;

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }
    await deleteTaskRecord(id);
    return NextResponse.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    return taskErrorResponse(error, "Failed to delete task");
  }
}
