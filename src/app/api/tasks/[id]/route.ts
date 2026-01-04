import { NextRequest, NextResponse } from "next/server";
import { getGoogleSheetsClient } from "@/lib/googleSheets";
import { requireApiKey } from "@/lib/auth";

/**
 * PATCH handler - Updates a task
 *
 * Usage: PATCH /api/tasks/[id]
 * Headers: Authorization: Bearer YOUR_API_KEY (or X-API-Key: YOUR_API_KEY)
 * Body: { text?: string, completed?: boolean, date?: string, timeSpent?: string | number }
 *
 * This requires API key authentication
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check API key authentication
    const authError = requireApiKey(request);
    if (authError) {
      return NextResponse.json(
        {
          error: authError.error,
          message: authError.message,
          hint: authError.hint,
        },
        { status: authError.status }
      );
    }

    const { id: taskId } = await params;
    if (!taskId) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { text, completed, date, timeSpent } = body;

    // Validate that at least one field is being updated
    if (
      text === undefined &&
      completed === undefined &&
      date === undefined &&
      timeSpent === undefined
    ) {
      return NextResponse.json(
        {
          error:
            "At least one field (text, completed, date, or timeSpent) must be provided for update",
        },
        { status: 400 }
      );
    }

    // Connect to Google Sheets
    let sheets;
    try {
      sheets = await getGoogleSheetsClient();
    } catch (authError) {
      console.error("❌ Failed to authenticate with Google Sheets:", authError);
      return NextResponse.json(
        {
          error: "Failed to authenticate with Google Sheets",
          details:
            authError instanceof Error
              ? authError.message
              : "Unknown authentication error",
        },
        { status: 500 }
      );
    }

    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || "Sheet1";

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: "Spreadsheet ID not configured" },
        { status: 500 }
      );
    }

    // Read all rows to find the task
    const range = `${sheetName}!A2:F1000`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];
    const taskRowIndex = rows.findIndex((row) => row[0] === taskId);

    if (taskRowIndex === -1) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Get the current row (row index + 2 because we start from row 2, and arrays are 0-indexed)
    const actualRowNumber = taskRowIndex + 2;
    const currentRow = rows[taskRowIndex];

    // Prepare updated values
    const updatedId = currentRow[0] || "";
    const updatedDate = date !== undefined ? date : currentRow[1] || "";
    const updatedText = text !== undefined ? text.trim() : currentRow[2] || "";
    const updatedCompleted =
      completed !== undefined
        ? completed === true
          ? "true"
          : "false"
        : currentRow[3] || "false";
    const updatedCreatedAt = currentRow[4] || new Date().toISOString();
    const updatedTimeSpent =
      timeSpent !== undefined ? String(timeSpent) : currentRow[5] || "";

    // Update the row in Google Sheets
    const updateRange = `${sheetName}!A${actualRowNumber}:F${actualRowNumber}`;
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
            updatedTimeSpent,
          ],
        ],
      },
    });

    // Return the updated task
    const updatedTask = {
      id: updatedId,
      date: updatedDate,
      text: updatedText,
      completed: updatedCompleted === "true",
      created_at: updatedCreatedAt,
      timeSpent: updatedTimeSpent,
    };

    return NextResponse.json({
      success: true,
      task: updatedTask,
    });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      {
        error: "Failed to update task",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler - Deletes a task
 *
 * Usage: DELETE /api/tasks/[id]
 * Headers: Authorization: Bearer YOUR_API_KEY (or X-API-Key: YOUR_API_KEY)
 *
 * This requires API key authentication
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check API key authentication
    const authError = requireApiKey(request);
    if (authError) {
      return NextResponse.json(
        {
          error: authError.error,
          message: authError.message,
          hint: authError.hint,
        },
        { status: authError.status }
      );
    }

    const { id: taskId } = await params;
    if (!taskId) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    // Connect to Google Sheets
    let sheets;
    try {
      sheets = await getGoogleSheetsClient();
    } catch (authError) {
      console.error("❌ Failed to authenticate with Google Sheets:", authError);
      return NextResponse.json(
        {
          error: "Failed to authenticate with Google Sheets",
          details:
            authError instanceof Error
              ? authError.message
              : "Unknown authentication error",
        },
        { status: 500 }
      );
    }

    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || "Sheet1";

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: "Spreadsheet ID not configured" },
        { status: 500 }
      );
    }

    // Read all rows to find the task
    const range = `${sheetName}!A2:F1000`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];
    const taskRowIndex = rows.findIndex((row) => row[0] === taskId);

    if (taskRowIndex === -1) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
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
      return NextResponse.json({ error: "Sheet not found" }, { status: 404 });
    }

    // Delete the row (row index + 2 because we start from row 2, and arrays are 0-indexed)
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
                startIndex: actualRowNumber - 1, // 0-indexed
                endIndex: actualRowNumber,
              },
            },
          },
        ],
      },
    });

    return NextResponse.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      {
        error: "Failed to delete task",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
