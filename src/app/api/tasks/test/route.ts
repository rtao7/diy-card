import { NextRequest, NextResponse } from "next/server";
import { getGoogleSheetsClient } from "@/lib/googleSheets";

/**
 * GET handler - Test endpoint to verify Google Sheets connection
 *
 * Usage: GET /api/tasks/test
 *
 * This endpoint helps diagnose connection issues
 */
export async function GET(request: NextRequest) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    checks: {},
    errors: [],
    warnings: [],
  };

  try {
    // Check 1: Environment variables
    diagnostics.checks.environmentVariables = {
      hasSpreadsheetId: !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      hasCredentialsJson: !!process.env.GOOGLE_SHEETS_CREDENTIALS_JSON,
      hasCredentialsBase64: !!process.env.GOOGLE_SHEETS_CREDENTIALS_BASE64,
      hasCredentialsPath: !!process.env.GOOGLE_SHEETS_CREDENTIALS,
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID
        ? `${process.env.GOOGLE_SHEETS_SPREADSHEET_ID.substring(0, 10)}...`
        : "NOT SET",
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || "Sheet1 (default)",
    };

    if (!process.env.GOOGLE_SHEETS_SPREADSHEET_ID) {
      diagnostics.errors.push("GOOGLE_SHEETS_SPREADSHEET_ID is not set");
    }

    const hasAnyCredentials =
      !!process.env.GOOGLE_SHEETS_CREDENTIALS_JSON ||
      !!process.env.GOOGLE_SHEETS_CREDENTIALS_BASE64 ||
      !!process.env.GOOGLE_SHEETS_CREDENTIALS;

    if (!hasAnyCredentials) {
      diagnostics.errors.push(
        "No credentials found. Set one of: GOOGLE_SHEETS_CREDENTIALS_JSON, GOOGLE_SHEETS_CREDENTIALS_BASE64, or GOOGLE_SHEETS_CREDENTIALS"
      );
      return NextResponse.json(diagnostics, { status: 500 });
    }

    // Check 2: Try to initialize Google Sheets client
    let sheets;
    try {
      sheets = await getGoogleSheetsClient();
      diagnostics.checks.clientInitialization = {
        status: "success",
        message: "Google Sheets client initialized successfully",
      };
    } catch (authError) {
      diagnostics.checks.clientInitialization = {
        status: "failed",
        error: authError instanceof Error ? authError.message : "Unknown error",
      };
      diagnostics.errors.push("Failed to initialize Google Sheets client");
      return NextResponse.json(diagnostics, { status: 500 });
    }

    // Check 3: Try to access the spreadsheet
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
    const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || "Sheet1";

    try {
      // First, try to get spreadsheet metadata
      const spreadsheetInfo = await sheets.spreadsheets.get({
        spreadsheetId,
      });

      diagnostics.checks.spreadsheetAccess = {
        status: "success",
        title: spreadsheetInfo.data.properties?.title || "Unknown",
        spreadsheetId: spreadsheetId.substring(0, 10) + "...",
        sheets:
          spreadsheetInfo.data.sheets?.map((s: any) => ({
            title: s.properties?.title,
            sheetId: s.properties?.sheetId,
          })) || [],
      };

      // Check if the target sheet exists
      const targetSheet = spreadsheetInfo.data.sheets?.find(
        (s: any) => s.properties?.title === sheetName
      );

      if (!targetSheet) {
        diagnostics.warnings.push(
          `Sheet "${sheetName}" not found. Available sheets: ${
            spreadsheetInfo.data.sheets
              ?.map((s: any) => s.properties?.title)
              .join(", ") || "none"
          }`
        );
      }

      // Try to read a small range from the sheet
      const testRange = `${sheetName}!A1:E10`;
      const testResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: testRange,
      });

      diagnostics.checks.dataRead = {
        status: "success",
        range: testRange,
        rowsFound: testResponse.data.values?.length || 0,
        sampleData: testResponse.data.values?.slice(0, 3) || [],
      };

      diagnostics.summary = {
        status: "success",
        message: "All checks passed! Google Sheets connection is working.",
      };
    } catch (apiError: any) {
      diagnostics.checks.spreadsheetAccess = {
        status: "failed",
        error: apiError?.message || "Unknown error",
        code: apiError?.code,
      };

      if (apiError?.code === 403) {
        diagnostics.errors.push(
          "Permission denied. Make sure the spreadsheet is shared with the service account email."
        );
      } else if (apiError?.code === 404) {
        diagnostics.errors.push(
          "Spreadsheet not found. Check that GOOGLE_SHEETS_SPREADSHEET_ID is correct."
        );
      } else {
        diagnostics.errors.push(
          `API error: ${apiError?.message || "Unknown error"}`
        );
      }

      diagnostics.summary = {
        status: "failed",
        message: "Failed to access spreadsheet",
      };
    }

    return NextResponse.json(diagnostics, {
      status: diagnostics.errors.length > 0 ? 500 : 200,
    });
  } catch (error) {
    diagnostics.errors.push(
      error instanceof Error ? error.message : "Unknown error"
    );
    diagnostics.summary = {
      status: "error",
      message: "Unexpected error during diagnostics",
    };
    return NextResponse.json(diagnostics, { status: 500 });
  }
}
