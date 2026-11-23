import type { TaskInput, TaskPatch } from "./taskModel";
import type { Task } from "./types";

/**
 * Browser API for the card. Writes go through server actions so the API key
 * stays on the server. The assistant uses the HTTP routes instead.
 */

export async function getTasksForDate(date: string): Promise<Task[]> {
  const response = await fetch(`/api/tasks?date=${encodeURIComponent(date)}`, {
    cache: "no-store",
  });

  let data: {
    error?: string;
    details?: string;
    hint?: string;
    tasks?: Task[];
  };
  try {
    data = await response.json();
  } catch {
    throw new Error(`Failed to fetch tasks: ${response.status} ${response.statusText}`);
  }

  if (!response.ok) {
    const message =
      data.details || data.error || `Failed to fetch tasks: ${response.statusText}`;
    throw new Error(message);
  }

  return data.tasks ?? [];
}

export async function createTask(input: TaskInput): Promise<Task> {
  const { createTaskAction } = await import("@/app/api/tasks/actions");
  const result = await createTaskAction(input);
  return result.task;
}

export async function updateTask(
  taskId: string,
  updates: TaskPatch,
): Promise<Task> {
  const { updateTaskAction } = await import("@/app/api/tasks/actions");
  const result = await updateTaskAction(taskId, updates);
  return result.task;
}

export async function deleteTask(taskId: string): Promise<void> {
  const { deleteTaskAction } = await import("@/app/api/tasks/actions");
  await deleteTaskAction(taskId);
}
