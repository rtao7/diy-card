/**
 * Browser client for the task API.
 * Reads are public. Status changes go through a server action so the API key
 * stays on the server. Assistants should call the HTTP routes with API_KEY.
 */

import { Task, TaskInput, TaskPatch, TaskStatus } from "./types";

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

export async function createTask(input: TaskInput): Promise<Task> {
  const { createTaskAction } = await import("@/app/api/tasks/actions");
  const result = await createTaskAction(input);
  return result.task;
}

export async function updateTask(taskId: string, updates: TaskPatch): Promise<Task> {
  const { updateTaskAction } = await import("@/app/api/tasks/actions");
  const result = await updateTaskAction(taskId, updates);
  return result.task;
}

export async function deleteTask(taskId: string): Promise<void> {
  const { deleteTaskAction } = await import("@/app/api/tasks/actions");
  await deleteTaskAction(taskId);
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
): Promise<Task> {
  const { updateTaskStatusAction } = await import("@/app/api/tasks/actions");
  const result = await updateTaskStatusAction(taskId, status);
  return result.task;
}
