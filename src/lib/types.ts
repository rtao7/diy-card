/**
 * Shared type definitions for the DIY Card application.
 * The task shape lives in taskModel so the sheet, the API, and the card agree.
 */

export type { Task, TaskStatus, TaskInput, TaskPatch } from "./taskModel";

/**
 * API error response structure
 */
export interface ApiErrorResponse {
  error: string;
  details?: string;
  hint?: string;
  code?: string;
  status?: number;
  apiError?: {
    status: number;
    error: string;
    details?: string;
    hint?: string;
    environmentStatus?: string;
  };
}

/**
 * Type guard to check if an error is an API error
 */
export function isApiError(error: unknown): error is ApiErrorResponse {
  return (
    typeof error === "object" &&
    error !== null &&
    ("apiError" in error ||
      ("error" in error &&
        typeof (error as { error?: unknown }).error === "string"))
  );
}

/**
 * API success response for task operations
 */
export interface TaskApiResponse {
  success: boolean;
  task?: import("./taskModel").Task;
  tasks?: import("./taskModel").Task[];
  date?: string;
  count?: number;
  message?: string;
}
