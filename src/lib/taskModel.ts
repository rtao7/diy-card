/**
 * Task shape, sheet columns, and time-block helpers.
 *
 * Sheet columns, in order (row 1 is the header, data starts at row 2):
 * A id, B date, C text, D completed, E created_at,
 * F start, G end, H status, I first_step, J done_means.
 *
 * `completed` stays in column D so older rows still read:
 * "true" with an empty status becomes done, anything else becomes pending.
 * When a status is present it wins. Writes keep column D in sync
 * (done → true, pending or slipped → false).
 */

export const SHEET_HEADERS = [
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
] as const;

export const COL = {
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
} as const;

export const SHEET_WIDTH = SHEET_HEADERS.length;

export const TASK_STATUSES = ["pending", "done", "slipped"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface Task {
  id: string;
  date: string;
  text: string;
  /** True only when status is done. Older clients still read this boolean. */
  completed: boolean;
  created_at: string;
  /** 24-hour HH:MM, or "" when the block has no start. */
  start: string;
  /** 24-hour HH:MM, or "" when the block has no end. */
  end: string;
  status: TaskStatus;
  first_step: string;
  done_means: string;
}

export interface TaskInput {
  date: string;
  text: string;
  completed?: boolean;
  status?: TaskStatus;
  start?: string;
  end?: string;
  first_step?: string;
  done_means?: string;
}

export interface TaskPatch {
  text?: string;
  date?: string;
  completed?: boolean;
  status?: TaskStatus;
  start?: string;
  end?: string;
  first_step?: string;
  done_means?: string;
}

const DAY_MINUTES = 24 * 60;

export function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(value);
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Accept HH:MM, H:MM, optional seconds, and Google Sheets' AM/PM formatting.
 * Anything else (including a legacy freeform time_spent value) becomes "".
 */
export function parseClock(value: string | undefined | null): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";

  const ampm = /^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])$/.exec(raw);
  if (ampm) {
    let hours = Number(ampm[1]);
    const minutes = Number(ampm[2]);
    if (hours < 1 || hours > 12 || minutes > 59) return "";
    const pm = ampm[3].toLowerCase() === "pm";
    if (hours === 12) hours = pm ? 12 : 0;
    else if (pm) hours += 12;
    return `${pad2(hours)}:${pad2(minutes)}`;
  }

  const twentyFour = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(raw);
  if (twentyFour) {
    const hours = Number(twentyFour[1]);
    const minutes = Number(twentyFour[2]);
    if (hours > 23 || minutes > 59) return "";
    return `${pad2(hours)}:${pad2(minutes)}`;
  }

  return "";
}

export function clockToMinutes(value: string | undefined | null): number | null {
  const clock = parseClock(value);
  if (!clock) return null;
  const [hours, minutes] = clock.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToClock(minutes: number): string {
  const clamped = Math.max(0, Math.min(DAY_MINUTES - 1, Math.floor(minutes)));
  return `${pad2(Math.floor(clamped / 60))}:${pad2(clamped % 60)}`;
}

export function statusFromCells(
  completedCell: string | undefined,
  statusCell: string | undefined,
): TaskStatus {
  const status = (statusCell ?? "").trim().toLowerCase();
  if (isTaskStatus(status)) return status;
  const completed = (completedCell ?? "").trim().toLowerCase();
  if (completed === "true" || completed === "1" || completed === "yes") {
    return "done";
  }
  return "pending";
}

export function completedValue(status: TaskStatus): "true" | "false" {
  return status === "done" ? "true" : "false";
}

export function resolveWriteStatus(input: {
  status?: TaskStatus;
  completed?: boolean;
}): TaskStatus {
  if (input.status) return input.status;
  if (input.completed === true) return "done";
  return "pending";
}

export function rowToTask(row: readonly string[] | undefined): Task | null {
  if (!row || row.length < 2) return null;
  const id = String(row[COL.id] ?? "").trim();
  const date = String(row[COL.date] ?? "").trim();
  if (!id || !date) return null;
  const status = statusFromCells(
    row[COL.completed] == null ? "" : String(row[COL.completed]),
    row[COL.status] == null ? "" : String(row[COL.status]),
  );
  return {
    id,
    date,
    text: String(row[COL.text] ?? "").trim(),
    completed: status === "done",
    created_at: String(row[COL.created_at] ?? ""),
    start: parseClock(row[COL.start] == null ? "" : String(row[COL.start])),
    end: parseClock(row[COL.end] == null ? "" : String(row[COL.end])),
    status,
    first_step: String(row[COL.first_step] ?? "").trim(),
    done_means: String(row[COL.done_means] ?? "").trim(),
  };
}

export function taskToRow(task: Task): string[] {
  return [
    task.id,
    task.date,
    task.text,
    completedValue(task.status),
    task.created_at,
    task.start,
    task.end,
    task.status,
    task.first_step,
    task.done_means,
  ];
}

export function createTaskId(index = 0): string {
  return `task-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
}

export function inputToTask(input: TaskInput, index = 0, now = new Date()): Task {
  const status = resolveWriteStatus(input);
  return {
    id: createTaskId(index),
    date: input.date,
    text: input.text.trim(),
    completed: status === "done",
    created_at: now.toISOString(),
    start: parseClock(input.start ?? ""),
    end: parseClock(input.end ?? ""),
    status,
    first_step: (input.first_step ?? "").trim(),
    done_means: (input.done_means ?? "").trim(),
  };
}

export function applyPatch(task: Task, patch: TaskPatch): Task {
  const status =
    patch.status !== undefined
      ? patch.status
      : patch.completed !== undefined
        ? patch.completed
          ? "done"
          : "pending"
        : task.status;
  return {
    ...task,
    text: patch.text !== undefined ? patch.text.trim() : task.text,
    date: patch.date !== undefined ? patch.date : task.date,
    start: patch.start !== undefined ? parseClock(patch.start) : task.start,
    end: patch.end !== undefined ? parseClock(patch.end) : task.end,
    first_step:
      patch.first_step !== undefined ? patch.first_step.trim() : task.first_step,
    done_means:
      patch.done_means !== undefined ? patch.done_means.trim() : task.done_means,
    status,
    completed: status === "done",
  };
}

export function hasStart(task: Task): boolean {
  return clockToMinutes(task.start) != null;
}

export function hasTimeRange(task: Task): boolean {
  const start = clockToMinutes(task.start);
  const end = clockToMinutes(task.end);
  return start != null && end != null && end > start;
}

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const aStart = clockToMinutes(a.start);
    const bStart = clockToMinutes(b.start);
    if (aStart != null && bStart != null && aStart !== bStart) {
      return aStart - bStart;
    }
    if (aStart != null && bStart == null) return -1;
    if (aStart == null && bStart != null) return 1;
    const aEnd = clockToMinutes(a.end);
    const bEnd = clockToMinutes(b.end);
    if (aEnd != null && bEnd != null && aEnd !== bEnd) return aEnd - bEnd;
    if (a.created_at !== b.created_at) {
      return a.created_at < b.created_at ? -1 : 1;
    }
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export function nowMinutes(now: Date): number {
  return now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
}

export function isCurrentBlock(task: Task, now: Date): boolean {
  if (!hasTimeRange(task)) return false;
  const exact = nowMinutes(now);
  const start = clockToMinutes(task.start)!;
  const end = clockToMinutes(task.end)!;
  return exact >= start && exact < end;
}

/** When blocks overlap, the one that started latest is the current block. */
export function currentTaskId(tasks: Task[], now: Date): string | null {
  const current = sortTasks(tasks).filter((task) => isCurrentBlock(task, now));
  if (current.length === 0) return null;
  return current[current.length - 1].id;
}

export function blockProgress(task: Task, now: Date): number {
  if (!isCurrentBlock(task, now)) return 0;
  const start = clockToMinutes(task.start)!;
  const end = clockToMinutes(task.end)!;
  const span = end - start;
  if (span <= 0) return 0;
  return Math.min(1, Math.max(0, (nowMinutes(now) - start) / span));
}

export type NowPlacement =
  | { kind: "empty" }
  | { kind: "before"; taskId: string }
  | { kind: "inside"; taskId: string }
  | { kind: "after" };

/**
 * Where the live marker sits among timed blocks.
 * Untimed tasks are ignored so the marker stays on the clock.
 */
export function nowPlacement(tasks: Task[], now: Date): NowPlacement {
  const timed = sortTasks(tasks).filter(hasTimeRange);
  if (timed.length === 0) return { kind: "empty" };
  const exact = nowMinutes(now);
  for (const task of timed) {
    const start = clockToMinutes(task.start)!;
    const end = clockToMinutes(task.end)!;
    if (exact < start) return { kind: "before", taskId: task.id };
    if (exact < end) return { kind: "inside", taskId: task.id };
  }
  return { kind: "after" };
}

export function formatClock(now: Date): string {
  return `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
}

export function formatDuration(start: string, end: string): string {
  const startMinutes = clockToMinutes(start);
  const endMinutes = clockToMinutes(end);
  if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) {
    return "";
  }
  const minutes = endMinutes - startMinutes;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return hours === 1 ? "1 hr" : `${hours} hr`;
  return `${hours} hr ${rest} min`;
}

export function formatRange(task: Task): string {
  if (task.start && task.end) return `${task.start}–${task.end}`;
  if (task.start) return task.start;
  return "Anytime";
}

/**
 * A single paragraph up to this length stays the block title.
 * Longer copy, and anything with a paragraph break, is a note.
 */
export const TASK_TITLE_MAX_LENGTH = 500;

export type TaskTextParts = {
  title: string;
  body: string;
};

/**
 * Split task text for display. Every non-space character is kept:
 * a short first line can be the title, and the rest is the note body.
 */
export function splitTaskText(text: string): TaskTextParts {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) return { title: "", body: "" };

  const breakAt = normalized.indexOf("\n");
  if (breakAt === -1) {
    if (normalized.length <= TASK_TITLE_MAX_LENGTH) {
      return { title: normalized, body: "" };
    }
    return { title: "", body: normalized };
  }

  const first = normalized.slice(0, breakAt).trim();
  const rest = normalized.slice(breakAt + 1).replace(/^\n+/, "").trim();
  if (first.length > 0 && first.length <= TASK_TITLE_MAX_LENGTH) {
    if (!rest) return { title: first, body: "" };
    return { title: first, body: rest };
  }
  return { title: "", body: normalized };
}

export function formatSheetDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

export function shiftDay(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

export function rangeError(start?: string, end?: string): string | null {
  if (!start || !end) return null;
  const startMinutes = clockToMinutes(start);
  const endMinutes = clockToMinutes(end);
  if (startMinutes == null || endMinutes == null) return null;
  if (endMinutes <= startMinutes) return "end must be after start";
  return null;
}

type DemoDraft = {
  id: string;
  text: string;
  status: TaskStatus;
  start: number;
  end: number;
  first_step: string;
  done_means: string;
};

function slot(start: number, duration: number): { start: number; end: number } | null {
  if (duration < 10) return null;
  const end = start + duration;
  if (start < 0 || end > DAY_MINUTES) return null;
  return { start, end };
}

function overlaps(a: DemoDraft, b: DemoDraft): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * A sample day around `now`: one block contains the current minute,
 * one is done, and one is slipped. Used only by the in-memory sheet.
 */
export function buildDemoSchedule(now: Date): DemoDraft[] {
  const center = now.getHours() * 60 + now.getMinutes();
  let currentStart = center - 20;
  let currentEnd = center + 50;
  if (currentStart < 0) {
    currentEnd -= currentStart;
    currentStart = 0;
  }
  if (currentEnd > DAY_MINUTES) {
    currentStart -= currentEnd - DAY_MINUTES;
    currentEnd = DAY_MINUTES;
  }
  if (currentStart < 0) currentStart = 0;
  if (currentEnd <= center) currentEnd = Math.min(DAY_MINUTES, center + 1);
  if (currentStart > center) currentStart = center;

  const current: DemoDraft = {
    id: "demo-deep-work",
    text: "Deep work",
    status: "pending",
    start: currentStart,
    end: currentEnd,
    first_step: "Open yesterday's draft",
    done_means: "The next section is sent",
  };

  const drafts: DemoDraft[] = [current];

  const doneSlot =
    slot(currentStart - 95, 40) ??
    (currentStart >= 25 ? slot(0, Math.min(30, currentStart - 8)) : null);
  if (doneSlot) {
    drafts.push({
      id: "demo-pages",
      text: "Morning pages",
      status: "done",
      start: doneSlot.start,
      end: doneSlot.end,
      first_step: "Open a blank page",
      done_means: "One page, unedited",
    });
  }

  const slippedStart = doneSlot ? doneSlot.end + 8 : currentStart - 40;
  const slippedSlot = slot(slippedStart, 25);
  const slippedFits =
    slippedSlot != null &&
    slippedSlot.end <= currentStart - 5 &&
    (doneSlot == null || slippedSlot.start >= doneSlot.end);
  if (slippedFits && slippedSlot) {
    drafts.push({
      id: "demo-inbox",
      text: "Clear the inbox",
      status: "slipped",
      start: slippedSlot.start,
      end: slippedSlot.end,
      first_step: "Open the oldest thread",
      done_means: "Inbox at zero",
    });
  }

  const walk = slot(currentEnd + 15, 40);
  if (walk) {
    drafts.push({
      id: "demo-walk",
      text: "Walk",
      status: "pending",
      start: walk.start,
      end: walk.end,
      first_step: "Put shoes on",
      done_means: "Back at the desk",
    });
  }

  const closeAnchor = walk ? walk.end : currentEnd;
  const close = slot(closeAnchor + 15, 40);
  if (close) {
    drafts.push({
      id: "demo-close",
      text: "Close the loops",
      status: "pending",
      start: close.start,
      end: close.end,
      first_step: "List what is still open",
      done_means: "Tomorrow's first block is written",
    });
  }

  const lastEnd = drafts.reduce((max, draft) => Math.max(max, draft.end), 0);
  if (!drafts.some((draft) => draft.status === "done")) {
    const placed = slot(lastEnd + 15, 30);
    if (placed) {
      drafts.push({
        id: "demo-pages",
        text: "Morning pages",
        status: "done",
        start: placed.start,
        end: placed.end,
        first_step: "Open a blank page",
        done_means: "One page, unedited",
      });
    }
  }
  const afterDone = drafts.reduce((max, draft) => Math.max(max, draft.end), 0);
  if (!drafts.some((draft) => draft.status === "slipped")) {
    const placed = slot(afterDone + 10, 20);
    if (placed) {
      drafts.push({
        id: "demo-inbox",
        text: "Clear the inbox",
        status: "slipped",
        start: placed.start,
        end: placed.end,
        first_step: "Open the oldest thread",
        done_means: "Inbox at zero",
      });
    }
  }

  return drafts;
}

/** True when two different blocks share a minute. Exported for tests. */
export function demoScheduleOverlaps(now: Date): boolean {
  const drafts = buildDemoSchedule(now);
  return drafts.some((draft, index) =>
    drafts.some((other, otherIndex) => otherIndex !== index && overlaps(draft, other)),
  );
}

export function demoTasks(now = new Date()): Task[] {
  const date = formatSheetDate(now);
  const created_at = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    5,
  ).toISOString();
  return buildDemoSchedule(now).map((draft) => ({
    id: draft.id,
    date,
    text: draft.text,
    completed: draft.status === "done",
    created_at,
    start: minutesToClock(draft.start),
    end: minutesToClock(draft.end),
    status: draft.status,
    first_step: draft.first_step,
    done_means: draft.done_means,
  }));
}
