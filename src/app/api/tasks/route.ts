import { NextRequest, NextResponse } from "next/server";
import { getGoogleSheetsClient } from "@/lib/googleSheets";
import { requireApiKey } from "@/lib/auth";

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
    console.log("📊 Fetching tasks for date:", date);
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
          hint: "Check your credentials and ensure the service account email has access to the spreadsheet",
        },
        { status: 500 }
      );
    }

    // Step 4: Get your spreadsheet ID from environment variables
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || "Sheet1";

    if (!spreadsheetId) {
      console.error("❌ GOOGLE_SHEETS_SPREADSHEET_ID is not set");
      return NextResponse.json(
        { error: "Spreadsheet ID not configured" },
        { status: 500 }
      );
    }

    console.log(
      "📋 Using spreadsheet ID:",
      spreadsheetId.substring(0, 10) + "..."
    );
    console.log("📄 Using sheet name:", sheetName);

    // Step 5: Read data from the sheet
    // Range: Sheet1!A2:E1000 means:
    // - Sheet1: the sheet name (configurable via env var)
    // - A2:E1000: columns A through E, rows 2 to 1000 (skip header row 1)
    const range = `${sheetName}!A2:E1000`;

    let response;
    try {
      response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });
      console.log("✅ Successfully retrieved data from Google Sheets");
    } catch (apiError: any) {
      console.error("❌ Google Sheets API error:", apiError);

      // Provide helpful error messages based on common issues
      let errorMessage = apiError?.message || "Unknown error";
      let hint = "";

      if (
        apiError?.code === 403 ||
        errorMessage.includes("permission") ||
        errorMessage.includes("access")
      ) {
        hint =
          "The service account may not have access to the spreadsheet. Share the spreadsheet with the service account email.";
      } else if (apiError?.code === 404 || errorMessage.includes("not found")) {
        hint =
          "Spreadsheet not found. Check that the GOOGLE_SHEETS_SPREADSHEET_ID is correct and the spreadsheet exists.";
      } else if (errorMessage.includes("Unable to parse range")) {
        hint = `Sheet "${sheetName}" may not exist. Check the sheet name or set GOOGLE_SHEETS_SHEET_NAME environment variable.`;
      }

      return NextResponse.json(
        {
          error: "Failed to read from Google Sheets",
          details: errorMessage,
          hint,
          code: apiError?.code,
        },
        { status: 500 }
      );
    }

    // Step 6: Get the rows (or empty array if no data)
    const rows = response.data.values || [];
    console.log(`📥 Retrieved ${rows.length} total rows from spreadsheet`);

    if (rows.length === 0) {
      console.log(
        "⚠️ No data found in spreadsheet. This might be normal if the sheet is empty."
      );
      // Return empty tasks array instead of error
      return NextResponse.json({
        success: true,
        date,
        tasks: [],
        count: 0,
        message: "No tasks found for this date",
      });
    }

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
    console.log(`✅ Returning ${tasks.length} tasks for date ${date}`);
    return NextResponse.json({
      success: true,
      date,
      tasks,
      count: tasks.length,
    });
  } catch (error) {
    // If something goes wrong, log it and return an error
    console.error("❌ Error fetching tasks:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Always log detailed error for debugging in production
    console.error("Error stack:", errorStack);
    console.error("Environment check:", {
      hasCredentialsJson: !!process.env.GOOGLE_SHEETS_CREDENTIALS_JSON,
      hasCredentialsBase64: !!process.env.GOOGLE_SHEETS_CREDENTIALS_BASE64,
      hasCredentialsPath: !!process.env.GOOGLE_SHEETS_CREDENTIALS,
      hasSpreadsheetId: !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      spreadsheetIdSet: !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    });

    // Return detailed error information
    return NextResponse.json(
      {
        error: "Failed to fetch tasks",
        details: errorMessage,
        // Include helpful hints based on error type
        hint: errorMessage.includes("credentials")
          ? "Check your Google Sheets credentials in environment variables"
          : errorMessage.includes("Spreadsheet ID")
          ? "Check that GOOGLE_SHEETS_SPREADSHEET_ID is set correctly"
          : "Check Vercel logs for more details",
        // Include environment status (without sensitive data)
        environmentStatus: {
          hasCredentials: !!(
            process.env.GOOGLE_SHEETS_CREDENTIALS_JSON ||
            process.env.GOOGLE_SHEETS_CREDENTIALS_BASE64 ||
            process.env.GOOGLE_SHEETS_CREDENTIALS
          ),
          hasSpreadsheetId: !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
        },
        // Only include stack in development
        ...(process.env.NODE_ENV === "development" && errorStack
          ? { stack: errorStack }
          : {}),
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler - Creates a new task
 *
 * Usage: POST /api/tasks
 * Headers: Authorization: Bearer YOUR_API_KEY (or X-API-Key: YOUR_API_KEY)
 * Body: { text: string, date: string, completed?: boolean }
 *
 * This requires API key authentication - only authorized users can create tasks
 * GET requests are public (read-only), but POST requires authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Step 0: Check API key authentication (required for write operations)
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

    // Step 4: Get your spreadsheet ID from environment variables
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || "Sheet1";

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

    // Step 7: Append the new row to the sheet
    // Range: Sheet1!A:E means append to columns A through E
    const range = `${sheetName}!A:E`;
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
