import { getGoogleSheetsClient } from "./googleSheets";
import {
  applyPatch,
  COL,
  inputToTask,
  rowToTask,
  SHEET_WIDTH,
  sortTasks,
  taskToRow,
  Task,
  completedValue,
} from "./taskModel";
import type { TaskStore } from "./taskStore";

function sheetName(): string {
  return process.env.GOOGLE_SHEETS_SHEET_NAME || "Sheet1";
}

function spreadsheetId(): string {
  const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!id) throw new Error("Spreadsheet ID not configured");
  return id;
}

function readRange(name: string): string {
  return `${name}!A2:J`;
}

async function loadRows(): Promise<string[][]> {
  const sheets = await getGoogleSheetsClient();
  const name = sheetName();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range: readRange(name),
  });
  return (response.data.values ?? []).map((row) => row.map((cell) => String(cell ?? "")));
}

function findRow(rows: string[][], id: string): number {
  return rows.findIndex((row) => (row[COL.id] ?? "") === id);
}

/**
 * Google Sheet backing store.
 * New fields are appended after the original columns so short legacy rows still read.
 * Values are written RAW so a time like 20:00 stays text instead of a Sheets time serial.
 */
export function createGoogleTaskStore(): TaskStore {
  return {
    async listByDate(date) {
      const rows = await loadRows();
      const tasks: Task[] = [];
      for (const row of rows) {
        const task = rowToTask(row);
        if (task && task.date === date) tasks.push(task);
      }
      return sortTasks(tasks);
    },

    async createMany(inputs) {
      const created = inputs.map((input, index) => inputToTask(input, index));
      const sheets = await getGoogleSheetsClient();
      const name = sheetName();
      await sheets.spreadsheets.values.append({
        spreadsheetId: spreadsheetId(),
        range: `${name}!A:J`,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: created.map((task) => taskToRow(task)),
        },
      });
      return created;
    },

    async update(id, patch) {
      const rows = await loadRows();
      const index = findRow(rows, id);
      if (index === -1) throw new Error("Task not found");
      const current = rowToTask(rows[index]);
      if (!current) throw new Error("Task not found");
      const next = applyPatch(current, patch);
      const sheets = await getGoogleSheetsClient();
      const name = sheetName();
      const rowNumber = index + 2;
      const row = taskToRow(next);
      while (row.length < SHEET_WIDTH) row.push("");
      await sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId(),
        range: `${name}!A${rowNumber}:J${rowNumber}`,
        valueInputOption: "RAW",
        requestBody: { values: [row] },
      });
      return next;
    },

    async updateStatus(id, status) {
      const rows = await loadRows();
      const index = findRow(rows, id);
      if (index === -1) throw new Error("Task not found");
      const current = rowToTask(rows[index]);
      if (!current) throw new Error("Task not found");
      const next = applyPatch(current, { status });
      const sheets = await getGoogleSheetsClient();
      const name = sheetName();
      const rowNumber = index + 2;
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: spreadsheetId(),
        requestBody: {
          valueInputOption: "RAW",
          data: [
            {
              range: `${name}!D${rowNumber}`,
              values: [[completedValue(status)]],
            },
            {
              range: `${name}!H${rowNumber}`,
              values: [[status]],
            },
          ],
        },
      });
      return next;
    },

    async delete(id) {
      const rows = await loadRows();
      const index = findRow(rows, id);
      if (index === -1) throw new Error("Task not found");
      const sheets = await getGoogleSheetsClient();
      const idValue = spreadsheetId();
      const name = sheetName();
      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: idValue });
      const sheet = spreadsheet.data.sheets?.find(
        (item) => item.properties?.title === name,
      );
      const sheetId = sheet?.properties?.sheetId;
      if (sheetId === undefined) throw new Error("Sheet not found");
      const rowNumber = index + 2;
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: idValue,
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
    },
  };
}
