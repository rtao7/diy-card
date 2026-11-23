"use server";

import { shouldMockSheets, getTaskStore } from "@/lib/taskStore";
import { TaskInput, TaskPatch, TaskStatus } from "@/lib/taskModel";

function assertWritable() {
  if (shouldMockSheets()) return;
  if (!process.env.API_KEY) {
    throw new Error("API key not configured on server");
  }
}

export async function createTaskAction(input: TaskInput) {
  assertWritable();
  if (!input.text?.trim() || !input.date) {
    throw new Error("Both 'text' and 'date' are required");
  }
  const [task] = await getTaskStore().createMany([input]);
  return { success: true as const, task };
}

export async function updateTaskAction(taskId: string, updates: TaskPatch) {
  assertWritable();
  if (!taskId) throw new Error("Task ID is required");
  const task = await getTaskStore().update(taskId, updates);
  return { success: true as const, task };
}

export async function updateTaskStatusAction(
  taskId: string,
  status: TaskStatus,
) {
  assertWritable();
  if (!taskId) throw new Error("Task ID is required");
  const task = await getTaskStore().updateStatus(taskId, status);
  return { success: true as const, task };
}

export async function deleteTaskAction(taskId: string) {
  assertWritable();
  if (!taskId) throw new Error("Task ID is required");
  await getTaskStore().delete(taskId);
  return { success: true as const, message: "Task deleted successfully" };
}
