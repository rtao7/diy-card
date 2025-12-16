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

    // Check if the request was successful
    if (!response.ok) {
      throw new Error(`Failed to fetch tasks: ${response.statusText}`);
    }

    // Parse the JSON response
    const data = await response.json();
    console.log("📥 Raw API response:", data);
    console.log("📋 Tasks from API:", data.tasks);

    // Return the tasks array
    return data.tasks || [];
  } catch (error) {
    console.error("Error fetching tasks:", error);
    // Return empty array if there's an error (so UI doesn't break)
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
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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
