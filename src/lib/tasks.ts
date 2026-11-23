/**
 * Browser client for the task API.
 * Reads are public. Status changes go through a server action so the API key
 * stays on the server. Assistants should call the HTTP routes with API_KEY.
 */

import { Task, TaskStatus } from "./types";

export async function getTasksForDate(date: string): Promise<Task[]> {
  const response = await fetch(`/api/tasks?date=${encodeURIComponent(date)}`);
  let data: { tasks?: Task[]; error?: string; details?: string } = {};
  try {
    data = await response.json();
  } catch {
    throw new Error(
      `Failed to fetch tasks: ${response.status} ${response.statusText}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      data.details || data.error || `Failed to fetch tasks: ${response.statusText}`,
    );
  }

  return data.tasks ?? [];
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
): Promise<Task> {
  const { updateTaskStatusAction } = await import("@/app/api/tasks/actions");
  const result = await updateTaskStatusAction(taskId, status);
  return result.task;
}
