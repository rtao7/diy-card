import { normalizeSheetDate } from "./dates";
import {
  normalizeTime,
  resolveStatus,
  toPublicTask,
} from "./taskModel";
import type { Task } from "./types";

/**
 * Columns already on the sheet stay where they are.
 * New headers are appended, in order, into the next blank columns:
 * start, end, status, first_step, done_means.
 *
 * If a blank column already holds legacy duration values (not clock times),
 * it is kept as time_spent and the new headers start after it.
 * When the published sheet is id, date, text, completed, created_at,
 * the new headers land at F–J:
 * F start, G end, H status, I first_step, J done_means.
 */

const HEADER_ALIASES: Record<string, SheetField> = {
  id: "id",
  date: "date",
  text: "text",
  task: "text",
  completed: "completed",
  complete: "completed",
  created_at: "created_at",
  createdat: "created_at",
  created: "created_at",
  time_spent: "time_spent",
  timespent: "time_spent",
  start: "start",
  start_time: "start",
  end: "end",
  end_time: "end",
  status: "status",
  first_step: "first_step",
  firststep: "first_step",
  done_means: "done_means",
  donemeans: "done_means",
};

type SheetField =
  | "id"
  | "date"
  | "text"
  | "completed"
  | "created_at"
  | "time_spent"
  | "start"
  | "end"
  | "status"
  | "first_step"
  | "done_means";

type RequiredField = Exclude<SheetField, "time_spent">;

const NEW_FIELDS: RequiredField[] = [
  "start",
  "end",
  "status",
  "first_step",
  "done_means",
];

const CORE_FIELDS: { field: RequiredField; preferred: number }[] = [
  { field: "id", preferred: 0 },
  { field: "date", preferred: 1 },
  { field: "text", preferred: 2 },
  { field: "completed", preferred: 3 },
  { field: "created_at", preferred: 4 },
];

export interface SheetLayout {
  hasHeaderRow: boolean;
  headerChanged: boolean;
  header: string[];
  columns: Record<RequiredField, number>;
  timeSpentColumn: number | null;
}

export function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function columnLetter(index: number): string {
  let n = index + 1;
  let letters = "";
  while (n > 0) {
    const remainder = (n - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

export function cell(row: readonly string[], index: number | null | undefined): string {
  if (index == null || index < 0) return "";
  return String(row[index] ?? "").trim();
}

function canonicalLayout(): SheetLayout {
  return {
    hasHeaderRow: true,
    headerChanged: true,
    header: [
      "id",
      "date",
      "text",
      "completed",
      "created_at",
      "start",
      "end",
      "status",
      "first_step",
      "done_means",
    ],
    columns: {
      id: 0,
      date: 1,
      text: 2,
      completed: 3,
      created_at: 4,
      start: 5,
      end: 6,
      status: 7,
      first_step: 8,
      done_means: 9,
    },
    timeSpentColumn: null,
  };
}

export function resolveLayout(
  headerRow: readonly string[] | undefined,
  dataRows: readonly (readonly string[])[],
  options?: { emptySheet?: boolean },
): SheetLayout {
  if (options?.emptySheet) return canonicalLayout();

  const header = (headerRow ?? []).map((value) => String(value ?? ""));
  const first = normalizeHeader(header[0] ?? "");
  const hasHeaderRow = HEADER_ALIASES[first] === "id";

  if (!hasHeaderRow) {
    return {
      hasHeaderRow: false,
      headerChanged: false,
      header,
      columns: {
        id: 0,
        date: 1,
        text: 2,
        completed: 3,
        created_at: 4,
        start: 6,
        end: 7,
        status: 8,
        first_step: 9,
        done_means: 10,
      },
      timeSpentColumn: 5,
    };
  }

  const columns = {} as Record<RequiredField, number>;
  let timeSpentColumn: number | null = null;
  const used = new Set<number>();
  let headerChanged = false;

  header.forEach((value, index) => {
    const field = HEADER_ALIASES[normalizeHeader(value)];
    if (!field) return;
    if (field === "time_spent") {
      if (timeSpentColumn == null) {
        timeSpentColumn = index;
        used.add(index);
      }
      return;
    }
    if (columns[field] == null) {
      columns[field] = index;
      used.add(index);
    }
  });

  const label = (index: number, name: string) => {
    while (header.length <= index) header.push("");
    if (!header[index]?.trim()) {
      header[index] = name;
      headerChanged = true;
    }
  };

  const occupiedByOther = (index: number, field: SheetField) => {
    const existing = normalizeHeader(header[index] ?? "");
    if (!existing) return false;
    const mapped = HEADER_ALIASES[existing];
    return mapped !== field;
  };

  for (const { field, preferred } of CORE_FIELDS) {
    if (columns[field] != null) continue;
    let index = preferred;
    while (used.has(index) || occupiedByOther(index, field)) index += 1;
    columns[field] = index;
    used.add(index);
    label(index, field);
  }

  let cursor = used.size > 0 ? Math.max(...used) + 1 : 0;

  if (timeSpentColumn == null && columns.start == null) {
    const existing = normalizeHeader(header[cursor] ?? "");
    if (!existing) {
      const samples = dataRows
        .map((row) => cell(row, cursor))
        .filter((value) => value !== "");
      const clockTimes = samples.filter((value) => normalizeTime(value) !== "");
      if (samples.length > 0 && clockTimes.length === 0) {
        timeSpentColumn = cursor;
        used.add(cursor);
        label(cursor, "time_spent");
        cursor += 1;
      }
    }
  }

  const claimNext = (field: RequiredField) => {
    let index = cursor;
    while (used.has(index) || occupiedByOther(index, field)) index += 1;
    columns[field] = index;
    used.add(index);
    label(index, field);
    cursor = index + 1;
  };

  for (const field of NEW_FIELDS) {
    if (columns[field] == null) claimNext(field);
  }

  return {
    hasHeaderRow: true,
    headerChanged,
    header,
    columns,
    timeSpentColumn,
  };
}

export function decodeTaskRow(
  row: readonly string[],
  layout: SheetLayout,
): Task | null {
  const id = cell(row, layout.columns.id);
  const date = normalizeSheetDate(cell(row, layout.columns.date));
  if (!id || !date) return null;

  const status = resolveStatus(
    cell(row, layout.columns.completed),
    cell(row, layout.columns.status),
  );

  return toPublicTask({
    id,
    date,
    text: cell(row, layout.columns.text),
    status,
    completed: status === "done",
    created_at: cell(row, layout.columns.created_at),
    start: normalizeTime(cell(row, layout.columns.start)),
    end: normalizeTime(cell(row, layout.columns.end)),
    first_step: cell(row, layout.columns.first_step),
    done_means: cell(row, layout.columns.done_means),
    timeSpent: cell(row, layout.timeSpentColumn),
  });
}

export function encodeRow(
  existing: readonly string[] | undefined,
  task: Task,
  layout: SheetLayout,
): string[] {
  const publicTask = toPublicTask(task);
  const indexes = [
    ...Object.values(layout.columns),
    ...(layout.timeSpentColumn == null ? [] : [layout.timeSpentColumn]),
  ];
  const width = Math.max(existing?.length ?? 0, ...indexes) + 1;
  const row = Array.from({ length: width }, (_, index) => existing?.[index] ?? "");
  const set = (index: number | null, value: string) => {
    if (index == null) return;
    row[index] = value;
  };

  set(layout.columns.id, publicTask.id);
  set(layout.columns.date, publicTask.date);
  set(layout.columns.text, publicTask.text);
  set(layout.columns.completed, publicTask.completed ? "true" : "false");
  set(layout.columns.created_at, publicTask.created_at);
  set(layout.columns.start, publicTask.start);
  set(layout.columns.end, publicTask.end);
  set(layout.columns.status, publicTask.status);
  set(layout.columns.first_step, publicTask.first_step);
  set(layout.columns.done_means, publicTask.done_means);
  if (layout.timeSpentColumn != null) {
    set(layout.timeSpentColumn, publicTask.timeSpent);
  }
  return row;
}
