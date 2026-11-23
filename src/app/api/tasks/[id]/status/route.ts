import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  isMissingTask,
  jsonError,
  sheetFailure,
  unauthorized,
} from "@/lib/routeErrors";
import { getTaskStore } from "@/lib/taskStore";
import { UpdateStatusSchema, validateTaskData } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/tasks/:id/status
 * Body: { "status": "pending" | "done" | "slipped" }
 * Requires API_KEY. Also writes column D so older readers stay in sync.
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

  const validation = validateTaskData(UpdateStatusSchema, body);
  if (!validation.success) {
    return jsonError(400, "Validation failed", { details: validation.error });
  }

  try {
    const task = await getTaskStore().updateStatus(id, validation.data.status);
    return NextResponse.json({ success: true, task });
  } catch (error) {
    if (isMissingTask(error)) return jsonError(404, "Task not found");
    logger.error("Error updating status:", error);
    return sheetFailure(error, "Failed to update status");
  }
}
