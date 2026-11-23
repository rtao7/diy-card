import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  isMissingTask,
  jsonError,
  sheetFailure,
  unauthorized,
} from "@/lib/routeErrors";
import { getTaskStore } from "@/lib/taskStore";
import { rangeError } from "@/lib/taskModel";
import { UpdateTaskSchema, validateTaskData } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/tasks/:id
 * Updates any subset of fields. Requires API_KEY.
 * Sending `completed` without `status` maps true → done and false → pending.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const authError = unauthorized(request);
  if (authError) return authError;

  const { id } = await context.params;
  if (!id) return jsonError(400, "Task ID is required");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Validation failed", {
      details: "Request body must be JSON",
    });
  }

  const validation = validateTaskData(UpdateTaskSchema, body);
  if (!validation.success) {
    return jsonError(400, "Validation failed", { details: validation.error });
  }

  const patch = validation.data;
  if (
    patch.text === undefined &&
    patch.date === undefined &&
    patch.completed === undefined &&
    patch.status === undefined &&
    patch.start === undefined &&
    patch.end === undefined &&
    patch.first_step === undefined &&
    patch.done_means === undefined
  ) {
    return jsonError(400, "Validation failed", {
      details: "At least one field must be provided",
    });
  }

  const range = rangeError(patch.start, patch.end);
  if (range) {
    return jsonError(400, "Validation failed", { details: range });
  }

  try {
    const task = await getTaskStore().update(id, patch);
    return NextResponse.json({ success: true, task });
  } catch (error) {
    if (isMissingTask(error)) return jsonError(404, "Task not found");
    logger.error("Error updating task:", error);
    return sheetFailure(error, "Failed to update task");
  }
}

/**
 * DELETE /api/tasks/:id
 * Requires API_KEY.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const authError = unauthorized(request);
  if (authError) return authError;

  const { id } = await context.params;
  if (!id) return jsonError(400, "Task ID is required");

  try {
    await getTaskStore().delete(id);
    return NextResponse.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    if (isMissingTask(error)) return jsonError(404, "Task not found");
    logger.error("Error deleting task:", error);
    return sheetFailure(error, "Failed to delete task");
  }
}
