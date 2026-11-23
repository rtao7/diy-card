import { getGoogleSheetsClient } from "./googleSheets";
import { logger } from "./logger";
import {
  mockDeleteTask,
  mockInsertTasks,
  mockListTasks,
  mockUpdateTask,
} from "./mockTaskStore";
import {
  columnLetter,
  decodeTaskRow,
  encodeRow,
  resolveLayout,
  type SheetLayout,
} from "./sheetSchema";
import { SheetAccessError, TaskNotFoundError } from "./taskErrors";
import {
  applyTaskPatch,
  buildTask,
  compareTasks,
  toPublicTask,
  type TaskInput,
  type TaskPatch,
} from "./taskModel";
import { normalizeSheetDate } from "./dates";
import type { Task } from "./types";

type Sheets = Awaited<ReturnType<typeof getGoogleSheetsClient>>;

interface LoadedSheet {
  sheets: Sheets;
  spreadsheetId: string;
  sheetName: string;
  data: string[][];
  layout: SheetLayout;
}

const mockFlag = globalThis as typeof globalThis & {
  __diyCardMockLogged?: boolean;
};

function shouldUseMockSheets(): boolean {
  const flag = (process.env.MOCK_SHEETS ?? "").trim().toLowerCase();
  const explicit = flag === "1" || flag === "true" || flag === "yes";
  const use =
    explicit ||
    (process.env.NODE_ENV !== "production" &&
      !(
        (process.env.GOOGLE_SHEETS_CREDENTIALS_JSON ||
          process.env.GOOGLE_SHEETS_CREDENTIALS_BASE64 ||
          process.env.GOOGLE_SHEETS_CREDENTIALS) &&
        process.env.GOOGLE_SHEETS_SPREADSHEET_ID
      ));
  if (use && !mockFlag.__diyCardMockLogged) {
    mockFlag.__diyCardMockLogged = true;
    logger.info("Task store: in-memory mock.");
  }
  return use;
}

function asCellRows(values: unknown): string[][] {
  if (!Array.isArray(values)) return [];
  return values.map((row) => {
    if (!Array.isArray(row)) return [];
    return row.map((cell) => (cell == null ? "" : String(cell)));
  });
}

function describeSheetsError(error: unknown, sheetName: string): SheetAccessError {
  if (error instanceof SheetAccessError) return error;
  const apiError = error as { code?: number | string; message?: string };
  const message =
    apiError?.message || (error instanceof Error ? error.message : "Unknown error");
  const code = typeof apiError?.code === "number" ? apiError.code : undefined;
  let hint = "Check the server logs for details.";
  if (code === 403 || /permission|access/i.test(message)) {
    hint =
      "Share the spreadsheet with the service account email and give it Editor access.";
  } else if (code === 404 || /not found/i.test(message)) {
    hint = "Check that GOOGLE_SHEETS_SPREADSHEET_ID is the id from the sheet URL.";
  } else if (/Unable to parse range/i.test(message)) {
    hint = `Sheet "${sheetName}" was not found. Set GOOGLE_SHEETS_SHEET_NAME to the tab name.`;
  }
  return new SheetAccessError(message, hint);
}

async function connect() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || "Sheet1";
  if (!spreadsheetId) {
    throw new SheetAccessError(
      "Spreadsheet ID not configured",
      "Set GOOGLE_SHEETS_SPREADSHEET_ID.",
    );
  }
  const sheets = await getGoogleSheetsClient();
  return { sheets, spreadsheetId, sheetName };
}

async function loadSheet(): Promise<LoadedSheet> {
  const conn = await connect();
  let values: string[][];
  try {
    const response = await conn.sheets.spreadsheets.values.get({
      spreadsheetId: conn.spreadsheetId,
      range: `${conn.sheetName}!A1:AZ2000`,
    });
    values = asCellRows(response.data.values);
  } catch (error) {
    throw describeSheetsError(error, conn.sheetName);
  }

  const emptySheet =
    values.length === 0 ||
    values.every((row) => row.every((cell) => cell.trim() === ""));
  const header = emptySheet ? [] : (values[0] ?? []);
  const data = emptySheet ? [] : values.slice(1);
  const layout = resolveLayout(header, data, { emptySheet });
  return { ...conn, data, layout };
}

async function ensureHeader(loaded: LoadedSheet) {
  if (!loaded.layout.headerChanged || loaded.layout.header.length === 0) return;
  const last = columnLetter(loaded.layout.header.length - 1);
  try {
    await loaded.sheets.spreadsheets.values.update({
      spreadsheetId: loaded.spreadsheetId,
      range: `${loaded.sheetName}!A1:${last}1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [loaded.layout.header.map((cell) => cell ?? "")],
      },
    });
  } catch (error) {
    throw describeSheetsError(error, loaded.sheetName);
  }
}

function newTaskId(index: number): string {
  return `task-${Date.now().toString(36)}-${index.toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export async function listTasksForDate(date: string): Promise<Task[]> {
  const normalized = normalizeSheetDate(date);
  if (shouldUseMockSheets()) return mockListTasks(normalized);

  const loaded = await loadSheet();
  return loaded.data
    .map((row) => decodeTaskRow(row, loaded.layout))
    .filter((task): task is Task => task != null)
    .filter((task) => normalizeSheetDate(task.date) === normalized)
    .sort(compareTasks)
    .map(toPublicTask);
}

export async function createTask(input: TaskInput): Promise<Task> {
  const [task] = await createTasks(input.date, [input]);
  return task;
}

export async function createTasks(
  date: string,
  inputs: TaskInput[],
): Promise<Task[]> {
  const createdAt = Date.now();
  const tasks = inputs.map((input, index) =>
    buildTask(newTaskId(index), new Date(createdAt + index).toISOString(), {
      ...input,
      date,
    }),
  );

  if (shouldUseMockSheets()) {
    return mockInsertTasks(tasks);
  }

  const loaded = await loadSheet();
  await ensureHeader(loaded);
  const rows = tasks.map((task) => encodeRow(undefined, task, loaded.layout));
  const width = Math.max(...rows.map((row) => row.length));
  try {
    await loaded.sheets.spreadsheets.values.append({
      spreadsheetId: loaded.spreadsheetId,
      range: `${loaded.sheetName}!A:${columnLetter(width - 1)}`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: rows },
    });
  } catch (error) {
    throw describeSheetsError(error, loaded.sheetName);
  }
  return tasks.map(toPublicTask);
}

export async function updateTaskRecord(
  taskId: string,
  patch: TaskPatch,
): Promise<Task> {
  if (!taskId.trim()) throw new TaskNotFoundError();
  if (shouldUseMockSheets()) return mockUpdateTask(taskId, patch);

  const loaded = await loadSheet();
  const index = loaded.data.findIndex(
    (row) => (row[loaded.layout.columns.id] ?? "").trim() === taskId,
  );
  if (index === -1) throw new TaskNotFoundError();
  const current = decodeTaskRow(loaded.data[index], loaded.layout);
  if (!current) throw new TaskNotFoundError();
  const next = applyTaskPatch(current, patch);

  await ensureHeader(loaded);
  const encoded = encodeRow(loaded.data[index], next, loaded.layout);
  const rowNumber = index + 2;
  try {
    await loaded.sheets.spreadsheets.values.update({
      spreadsheetId: loaded.spreadsheetId,
      range: `${loaded.sheetName}!A${rowNumber}:${columnLetter(encoded.length - 1)}${rowNumber}`,
      valueInputOption: "RAW",
      requestBody: { values: [encoded] },
    });
  } catch (error) {
    throw describeSheetsError(error, loaded.sheetName);
  }
  return toPublicTask(next);
}

export async function deleteTaskRecord(taskId: string): Promise<void> {
  if (!taskId.trim()) throw new TaskNotFoundError();
  if (shouldUseMockSheets()) {
    mockDeleteTask(taskId);
    return;
  }

  const loaded = await loadSheet();
  const index = loaded.data.findIndex(
    (row) => (row[loaded.layout.columns.id] ?? "").trim() === taskId,
  );
  if (index === -1) throw new TaskNotFoundError();

  let sheetId: number | null | undefined;
  try {
    const spreadsheet = await loaded.sheets.spreadsheets.get({
      spreadsheetId: loaded.spreadsheetId,
    });
    sheetId = spreadsheet.data.sheets?.find(
      (sheet) => sheet.properties?.title === loaded.sheetName,
    )?.properties?.sheetId;
  } catch (error) {
    throw describeSheetsError(error, loaded.sheetName);
  }
  if (sheetId == null) {
    throw new SheetAccessError(
      "Sheet not found",
      `Set GOOGLE_SHEETS_SHEET_NAME to the tab that holds the tasks. Looked for "${loaded.sheetName}".`,
    );
  }

  const rowNumber = index + 2;
  try {
    await loaded.sheets.spreadsheets.batchUpdate({
      spreadsheetId: loaded.spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: rowNumber - 1,
                endIndex: rowNumber,
              },
            },
          },
        ],
      },
    });
  } catch (error) {
    throw describeSheetsError(error, loaded.sheetName);
  }
}
