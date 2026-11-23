/**
 * Shared type definitions for the daily card.
 *
 * `completed` stays on every task so older clients keep working:
 * it is true only when `status` is "done". Pending and slipped are false.
 */

export type TaskStatus = "pending" | "done" | "slipped";

export interface Task {
  id: string;
  /** Calendar day as M/D/YYYY, for example "11/24/2026". */
  date: string;
  text: string;
  /** True only when status is "done". */
  completed: boolean;
  status: TaskStatus;
  created_at: string;
  /** 24-hour HH:MM. Empty when the block has no start. */
  start: string;
  /** 24-hour HH:MM. Empty when the block has no end. */
  end: string;
  /** Optional two-minute start action. */
  first_step: string;
  /** Optional description of what done looks like. */
  done_means: string;
  /** Legacy duration note. Empty when unused. */
  timeSpent: string;
}

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

export function isApiError(error: unknown): error is ApiErrorResponse {
  return (
    typeof error === "object" &&
    error !== null &&
    ("apiError" in error ||
      ("error" in error && typeof (error as { error?: unknown }).error === "string"))
  );
}

export interface TaskApiResponse {
  success: boolean;
  task?: Task;
  tasks?: Task[];
  date?: string;
  count?: number;
  message?: string;
}
