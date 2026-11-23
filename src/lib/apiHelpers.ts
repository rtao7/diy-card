import { getGoogleSheetsClient } from "./googleSheets";
import { ApiError, API_ERRORS } from "./apiError";
import { rowToTask as parseRow, taskToRow as serializeTask, Task } from "./taskModel";

/**
 * Configuration for Google Sheets operations
 */
interface SheetsConfig {
  spreadsheetId: string;
  sheetName: string;
}

type SheetsClient = Awaited<ReturnType<typeof getGoogleSheetsClient>>;

/**
 * Gets the Google Sheets configuration from environment variables
 *
 * @throws {ApiError} If configuration is missing
 */
export function getSheetsConfig(): SheetsConfig {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || "Sheet1";

  if (!spreadsheetId) {
    throw API_ERRORS.CONFIGURATION_ERROR(
      "GOOGLE_SHEETS_SPREADSHEET_ID is not configured",
    );
  }

  return { spreadsheetId, sheetName };
}

/**
 * Higher-order function that wraps API handlers with Google Sheets client
 *
 * @param handler - Function to execute with sheets client and config
 * @returns Result from the handler
 */
export async function withSheetsClient<T>(
  handler: (sheets: SheetsClient, config: SheetsConfig) => Promise<T>,
): Promise<T> {
  try {
    const sheets = await getGoogleSheetsClient();
    const config = getSheetsConfig();
    return await handler(sheets, config);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw API_ERRORS.DATABASE_ERROR(
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}

/**
 * Finds a task row in Google Sheets by task ID
 *
 * @param sheets - Google Sheets client
 * @param config - Sheets configuration
 * @param taskId - Task ID to find
 * @returns Object with rowIndex and row data, or throws if not found
 */
export async function findTaskRow(
  sheets: SheetsClient,
  config: SheetsConfig,
  taskId: string,
): Promise<{ rowIndex: number; row: unknown[]; actualRowNumber: number }> {
  const range = `${config.sheetName}!A2:J`;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range,
  });

  const rows = response.data.values || [];
  const rowIndex = rows.findIndex((row) => row[0] === taskId);

  if (rowIndex === -1) {
    throw API_ERRORS.NOT_FOUND("Task");
  }

  // Actual row number in the sheet (+2 because we start from row 2 and arrays are 0-indexed)
  const actualRowNumber = rowIndex + 2;

  return {
    rowIndex,
    row: rows[rowIndex],
    actualRowNumber,
  };
}

/**
 * Converts a Google Sheets row to a Task object
 *
 * @param row - Row data from Google Sheets
 * @returns Task object
 */
export function rowToTask(row: unknown[]): Task | null {
  return parseRow((row ?? []).map((cell) => (cell == null ? "" : String(cell))));
}

/**
 * Converts a Task object to a Google Sheets row (columns A–J).
 */
export function taskToRow(task: Task): string[] {
  return serializeTask(task);
}

/**
 * Gets the sheet ID for a given sheet name
 *
 * @param sheets - Google Sheets client
 * @param config - Sheets configuration
 * @returns Sheet ID
 */
export async function getSheetId(
  sheets: SheetsClient,
  config: SheetsConfig,
): Promise<number> {
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: config.spreadsheetId,
  });

  const sheet = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title === config.sheetName,
  );

  if (!sheet || !sheet.properties?.sheetId) {
    throw API_ERRORS.NOT_FOUND(`Sheet "${config.sheetName}"`);
  }

  return sheet.properties.sheetId;
}
