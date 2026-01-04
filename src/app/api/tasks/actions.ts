"use server";

import { getGoogleSheetsClient } from "@/lib/googleSheets";

/**
 * Server action to create a task
 * This is called from the client but runs on the server, so API key is not exposed
 */
export async function createTaskAction(
  text: string,
  date: string,
  completed: boolean = false
) {
  try {
    // Validate input
    if (!text || !date) {
      throw new Error("Both 'text' and 'date' are required");
    }

    // Check API key (server-side only)
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API key not configured on server");
    }

    // Connect to Google Sheets
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || "Sheet1";

    if (!spreadsheetId) {
      throw new Error("Spreadsheet ID not configured");
    }

    // Generate ID and timestamp
    const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const created_at = new Date().toISOString();
    const completedValue = completed === true ? "true" : "false";

    // Prepare the new row data
    const newRow = [id, date, text.trim(), completedValue, created_at];

    // Append the new row to the sheet
    const range = `${sheetName}!A:E`;
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [newRow],
      },
    });

    return {
      success: true,
      task: {
        id,
        date,
        text: text.trim(),
        completed,
        created_at,
      },
    };
  } catch (error) {
    console.error("Error in createTaskAction:", error);
    throw error;
  }
}

/**
 * Server action to update a task
 */
export async function updateTaskAction(
  taskId: string,
  updates: {
    text?: string;
    completed?: boolean;
    date?: string;
  }
) {
  try {
    if (!taskId) {
      throw new Error("Task ID is required");
    }

    // Check API key (server-side only)
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API key not configured on server");
    }

    // Connect to Google Sheets
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || "Sheet1";

    if (!spreadsheetId) {
      throw new Error("Spreadsheet ID not configured");
    }

    // Read all rows to find the task
    const range = `${sheetName}!A2:E1000`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];
    const taskRowIndex = rows.findIndex((row) => row[0] === taskId);

    if (taskRowIndex === -1) {
      throw new Error("Task not found");
    }

    // Get the current row
    const actualRowNumber = taskRowIndex + 2;
    const currentRow = rows[taskRowIndex];

    // Prepare updated values
    const updatedId = currentRow[0] || "";
    const updatedDate = updates.date !== undefined ? updates.date : currentRow[1] || "";
    const updatedText =
      updates.text !== undefined ? updates.text.trim() : currentRow[2] || "";
    const updatedCompleted =
      updates.completed !== undefined
        ? updates.completed === true
          ? "true"
          : "false"
        : currentRow[3] || "false";
    const updatedCreatedAt = currentRow[4] || new Date().toISOString();

    // Update the row in Google Sheets
    const updateRange = `${sheetName}!A${actualRowNumber}:E${actualRowNumber}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: updateRange,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            updatedId,
            updatedDate,
            updatedText,
            updatedCompleted,
            updatedCreatedAt,
          ],
        ],
      },
    });

    return {
      success: true,
      task: {
        id: updatedId,
        date: updatedDate,
        text: updatedText,
        completed: updatedCompleted === "true",
        created_at: updatedCreatedAt,
      },
    };
  } catch (error) {
    console.error("Error in updateTaskAction:", error);
    throw error;
  }
}

/**
 * Server action to delete a task
 */
export async function deleteTaskAction(taskId: string) {
  try {
    if (!taskId) {
      throw new Error("Task ID is required");
    }

    // Check API key (server-side only)
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API key not configured on server");
    }

    // Connect to Google Sheets
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || "Sheet1";

    if (!spreadsheetId) {
      throw new Error("Spreadsheet ID not configured");
    }

    // Read all rows to find the task
    const range = `${sheetName}!A2:E1000`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];
    const taskRowIndex = rows.findIndex((row) => row[0] === taskId);

    if (taskRowIndex === -1) {
      throw new Error("Task not found");
    }

    // Get sheet ID from spreadsheet metadata
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });
    const sheet = spreadsheet.data.sheets?.find(
      (s) => s.properties?.title === sheetName
    );
    const sheetId = sheet?.properties?.sheetId;

    if (sheetId === undefined) {
      throw new Error("Sheet not found");
    }

    // Delete the row
    const actualRowNumber = taskRowIndex + 2;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: actualRowNumber - 1,
                endIndex: actualRowNumber,
              },
            },
          },
        ],
      },
    });

    return {
      success: true,
      message: "Task deleted successfully",
    };
  } catch (error) {
    console.error("Error in deleteTaskAction:", error);
    throw error;
  }
}

