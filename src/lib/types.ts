/**
 * Shared type definitions for the DIY Card application
 */

/**
 * Represents a task in the DIY card system
 *
 * @property id - Unique identifier for the task
 * @property date - Date in M/D/YYYY format (e.g., "12/25/2024")
 * @property text - The task description/content
 * @property completed - Whether the task is marked as complete
 * @property created_at - ISO timestamp of when the task was created
 * @property timeSpent - Optional time spent on the task (e.g., "2h", "30m")
 */
export interface Task {
  id: string;
  date: string;
  text: string;
  completed: boolean;
  created_at: string;
  timeSpent?: string | number;
}

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
      ("error" in error && typeof (error as any).error === "string"))
  );
}

/**
 * API success response for task operations
 */
export interface TaskApiResponse {
  success: boolean;
  task?: Task;
  tasks?: Task[];
  date?: string;
  count?: number;
  message?: string;
}
