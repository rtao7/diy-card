import { NextRequest, NextResponse } from "next/server";
import { getGoogleSheetsClient } from "@/lib/googleSheets";

/**
 * GET handler - Fetches tasks for a specific date
 *
 * Usage: GET /api/tasks?date=12/25/2024
 *
 * This is PUBLIC - anyone can read tasks (no authentication needed)
 */
export async function GET(request: NextRequest) {
  try {
    // Step 1: Get the date from the URL query parameter
    // Example URL: /api/tasks?date=12/25/2024
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    // Step 2: Check if date was provided
    if (!date) {
      return NextResponse.json(
        {
          error: "Date parameter is required. Use: /api/tasks?date=12/25/2024",
        },
        { status: 400 }
      );
    }

    // Step 3: Connect to Google Sheets
    const sheets = await getGoogleSheetsClient();

    // Step 4: Get your spreadsheet ID from environment variables
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: "Spreadsheet ID not configured" },
        { status: 500 }
      );
    }

    // Step 5: Read data from the sheet
    // Range: Sheet1!A2:E1000 means:
    // - Sheet1: the sheet name
    // - A2:E1000: columns A through E, rows 2 to 1000 (skip header row 1)
    const range = "Sheet1!A2:E1000";

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    // Step 6: Get the rows (or empty array if no data)
    const rows = response.data.values || [];

    // Step 7: Filter tasks for the requested date and convert to our format
    // In Google Sheets:
    // Column A (index 0) = id
    // Column B (index 1) = date
    // Column C (index 2) = text
    // Column D (index 3) = completed (stored as "true" or "false" string)
    // Column E (index 4) = created_at
    // Validate rows have minimum required columns (at least date column at index 1)
    const tasks = rows
      .filter((row) => {
        // Ensure row has at least 2 elements (id and date) before accessing row[1]
        return row && row.length >= 2 && row[1] === date;
      })
      .map((row) => ({
        id: row[0] || "", // Column A: id
        date: row[1] || "", // Column B: date
        text: row[2] || "", // Column C: text
        completed: row[3] === "true", // Column D: convert "true"/"false" string to boolean
        created_at: row[4] || "", // Column E: created_at
      }));

    // Step 8: Return the tasks as JSON
    return NextResponse.json({
      success: true,
      date,
      tasks,
      count: tasks.length,
    });
  } catch (error) {
    // If something goes wrong, log it and return an error
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch tasks",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler - Creates a new task
 *
 * Usage: POST /api/tasks
 * Body: { text: string, date: string, completed?: boolean }
 *
 * This is PUBLIC - anyone can create tasks (no authentication needed)
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: Parse the request body
    const body = await request.json();
    const { text, date, completed } = body;

    // Step 2: Validate required fields
    if (!text || !date) {
      return NextResponse.json(
        {
          error:
            "Both 'text' and 'date' are required. Use: { text: 'Task text', date: '12/25/2024' }",
        },
        { status: 400 }
      );
    }

    // Step 3: Connect to Google Sheets
    const sheets = await getGoogleSheetsClient();

    // Step 4: Get your spreadsheet ID from environment variables
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: "Spreadsheet ID not configured" },
        { status: 500 }
      );
    }

    // Step 5: Generate ID and timestamp
    const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const created_at = new Date().toISOString();
    const completedValue = completed === true ? "true" : "false";

    // Step 6: Prepare the new row data
    // Format: [id, date, text, completed, created_at]
    const newRow = [id, date, text.trim(), completedValue, created_at];

    // Step 7: Append the new row to Sheet1
    // Range: Sheet1!A:E means append to columns A through E
    const range = "Sheet1!A:E";
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED", // This allows strings to be entered as-is
      insertDataOption: "INSERT_ROWS", // Insert a new row
      requestBody: {
        values: [newRow],
      },
    });

    // Step 8: Return the created task
    const createdTask = {
      id,
      date,
      text: text.trim(),
      completed: completed === true,
      created_at,
    };

    return NextResponse.json(
      {
        success: true,
        task: createdTask,
      },
      { status: 201 }
    );
  } catch (error) {
    // If something goes wrong, log it and return an error
    console.error("Error creating task:", error);
    return NextResponse.json(
      {
        error: "Failed to create task",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
