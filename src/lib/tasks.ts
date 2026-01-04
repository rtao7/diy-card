/**
 * Frontend API client for tasks
 * This file provides functions to call your API endpoints
 */

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  date?: string;
  created_at?: string;
  timeSpent?: string | number;
}

/**
 * Fetches tasks for a specific date from Google Sheets
 *
 * @param date - Date in format "M/D/YYYY" (e.g., "12/25/2024")
 * @returns Array of tasks for that date
 */
export async function getTasksForDate(date: string): Promise<Task[]> {
  try {
    // Call your API endpoint
    const response = await fetch(`/api/tasks?date=${encodeURIComponent(date)}`);

    // Parse the JSON response (even if it's an error)
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      // If response is not JSON, throw with status text
      throw new Error(
        `Failed to fetch tasks: ${response.status} ${response.statusText}`
      );
    }

    // Check if the request was successful
    if (!response.ok) {
      // Log the error details from the API
      console.error("❌ API Error:", {
        status: response.status,
        error: data.error,
        details: data.details,
        hint: data.hint,
        environmentStatus: data.environmentStatus,
      });

      // Throw error with details from API response
      const errorMessage =
        data.details ||
        data.error ||
        `Failed to fetch tasks: ${response.statusText}`;
      const error = new Error(errorMessage);

      // Add additional properties for debugging
      (error as any).apiError = {
        status: response.status,
        error: data.error,
        details: data.details,
        hint: data.hint,
        environmentStatus: data.environmentStatus,
      };

      throw error;
    }

    console.log("📥 Raw API response:", data);
    console.log("📋 Tasks from API:", data.tasks);

    // Return the tasks array
    return data.tasks || [];
  } catch (error) {
    console.error("❌ Error fetching tasks:", error);

    // Log additional error details if available
    if ((error as any)?.apiError) {
      console.error("API Error Details:", (error as any).apiError);
    }

    // Return empty array if there's an error (so UI doesn't break)
    // But log the error so it's visible in console
    return [];
  }
}

/**
 * Creates a new task
 * Uses server action to avoid exposing API key client-side
 *
 * @param text - The task text
 * @param date - Date in format "M/D/YYYY" (e.g., "12/25/2024")
 * @param completed - Whether the task is completed (default: false)
 * @returns The created task
 */
export async function createTask(
  text: string,
  date: string,
  completed: boolean = false,
  timeSpent?: string | number
): Promise<Task> {
  try {
    // Use server action instead of direct API call to avoid exposing API key
    const { createTaskAction } = await import("@/app/api/tasks/actions");
    const result = await createTaskAction(text, date, completed, timeSpent);
    return result.task;
  } catch (error) {
    console.error("Error creating task:", error);
    throw error;
  }
}

/**
 * Updates a task
 *
 * @param taskId - The task ID
 * @param updates - Object with fields to update (text, completed, date)
 * @returns The updated task
 */
export async function updateTask(
  taskId: string,
  updates: {
    text?: string;
    completed?: boolean;
    date?: string;
    timeSpent?: string | number;
  }
): Promise<Task> {
  try {
    // Use server action instead of direct API call
    const { updateTaskAction } = await import("@/app/api/tasks/actions");
    const result = await updateTaskAction(taskId, updates);
    return result.task;
  } catch (error) {
    console.error("Error updating task:", error);
    throw error;
  }
}

/**
 * Deletes a task
 *
 * @param taskId - The task ID
 * @returns Success message
 */
export async function deleteTask(taskId: string): Promise<void> {
  try {
    // Use server action instead of direct API call
    const { deleteTaskAction } = await import("@/app/api/tasks/actions");
    await deleteTaskAction(taskId);
  } catch (error) {
    console.error("Error deleting task:", error);
    throw error;
  }
}
