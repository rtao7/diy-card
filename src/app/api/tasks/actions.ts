"use server";

import { createTask, deleteTaskRecord, updateTaskRecord } from "@/lib/taskRepository";
import type { TaskInput, TaskPatch } from "@/lib/taskModel";
import {
  CreateTaskSchema,
  toTaskInput,
  toTaskPatch,
  UpdateTaskSchema,
  validateTaskData,
} from "@/lib/validation";

function assertServerWrite() {
  if (process.env.API_KEY) return;
  if (process.env.NODE_ENV !== "production") return;
  throw new Error("API key not configured on server");
}

export async function createTaskAction(input: TaskInput) {
  assertServerWrite();
  const validation = validateTaskData(CreateTaskSchema, input);
  if (!validation.success) throw new Error(validation.error);
  const task = await createTask(toTaskInput(validation.data));
  return { success: true as const, task };
}

export async function updateTaskAction(taskId: string, updates: TaskPatch) {
  assertServerWrite();
  const validation = validateTaskData(UpdateTaskSchema, updates);
  if (!validation.success) throw new Error(validation.error);
  const patch = toTaskPatch(validation.data);
  if (Object.values(patch).every((value) => value === undefined)) {
    throw new Error("Provide at least one field to update");
  }
  const task = await updateTaskRecord(taskId, patch);
  return { success: true as const, task };
}

export async function deleteTaskAction(taskId: string) {
  assertServerWrite();
  await deleteTaskRecord(taskId);
  return { success: true as const, message: "Task deleted successfully" };
}
