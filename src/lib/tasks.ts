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
 *
 * @param text - The task text
 * @param date - Date in format "M/D/YYYY" (e.g., "12/25/2024")
 * @param completed - Whether the task is completed (default: false)
 * @returns The created task
 */
export async function createTask(
  text: string,
  date: string,
  completed: boolean = false
): Promise<Task> {
  try {
    // Get API key from environment variable (NEXT_PUBLIC_API_KEY for client-side)
    const apiKey = process.env.NEXT_PUBLIC_API_KEY;

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Add API key to headers if available
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch("/api/tasks", {
      method: "POST",
      headers,
      body: JSON.stringify({ text, date, completed }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `Failed to create task: ${response.statusText}`
      );
    }

    const data = await response.json();
    return data.task;
  } catch (error) {
    console.error("Error creating task:", error);
    throw error;
  }
}
