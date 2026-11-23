import { TaskValidationError } from "./taskErrors";
import type { Task, TaskStatus } from "./types";

const CLOCK =
  /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?$/;

export interface TaskInput {
  text: string;
  date: string;
  status?: TaskStatus;
  completed?: boolean;
  start?: string;
  end?: string;
  first_step?: string;
  done_means?: string;
  timeSpent?: string | number;
}

export interface TaskPatch {
  text?: string;
  date?: string;
  status?: TaskStatus;
  completed?: boolean;
  start?: string;
  end?: string;
  first_step?: string;
  done_means?: string;
  timeSpent?: string | number;
}

export function parseTimeToMinutes(value: string): number | null {
  const match = CLOCK.exec(value.trim());
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const ampm = match[4]?.toLowerCase();
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || minutes > 59) {
    return null;
  }

  if (ampm) {
    if (hours < 1 || hours > 12) return null;
    if (ampm === "pm" && hours !== 12) hours += 12;
    if (ampm === "am" && hours === 12) hours = 0;
  } else if (hours > 23) {
    return null;
  }

  return hours * 60 + minutes;
}

export function formatMinutes(total: number): string {
  const minutes = Math.max(0, Math.min(24 * 60 - 1, Math.floor(total)));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function normalizeTime(value: string): string {
  const minutes = parseTimeToMinutes(value);
  if (minutes == null) return "";
  return formatMinutes(minutes);
}

export function formatDuration(start: string, end: string): string {
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);
  if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) {
    return "";
  }
  const duration = endMinutes - startMinutes;
  if (duration < 60) return `${duration}m`;
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

export function formatBlockTime(start: string, end: string): string {
  if (start && end) return `${start}–${end}`;
  if (start) return start;
  return "Anytime";
}

export function resolveStatus(
  completedRaw: string,
  statusRaw: string,
): TaskStatus {
  const status = statusRaw.trim().toLowerCase();
  if (status === "done" || status === "pending" || status === "slipped") {
    return status;
  }
  return completedRaw.trim().toLowerCase() === "true" ? "done" : "pending";
}

export function assertStatusAgreement(
  status: TaskStatus | undefined,
  completed: boolean | undefined,
) {
  if (status === undefined || completed === undefined) return;
  if (status === "done" && completed === false) {
    throw new TaskValidationError("status done conflicts with completed false");
  }
  if (status !== "done" && completed === true) {
    throw new TaskValidationError(
      `status ${status} conflicts with completed true`,
    );
  }
}

export function assertTimeOrder(start: string, end: string) {
  if (!start || !end) return;
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);
  if (startMinutes == null || endMinutes == null) {
    throw new TaskValidationError(
      "Time must be 24-hour HH:MM, for example 20:00",
    );
  }
  if (endMinutes <= startMinutes) {
    throw new TaskValidationError("end must be after start");
  }
}

export function toPublicTask(task: Task): Task {
  const status = task.status;
  return {
    id: task.id,
    date: task.date,
    text: task.text,
    completed: status === "done",
    status,
    created_at: task.created_at,
    start: task.start || "",
    end: task.end || "",
    first_step: task.first_step || "",
    done_means: task.done_means || "",
    timeSpent: task.timeSpent || "",
  };
}

export function compareTasks(a: Task, b: Task): number {
  const aStart = a.start ? parseTimeToMinutes(a.start) : null;
  const bStart = b.start ? parseTimeToMinutes(b.start) : null;
  if (aStart != null && bStart != null && aStart !== bStart) return aStart - bStart;
  if (aStart != null && bStart == null) return -1;
  if (aStart == null && bStart != null) return 1;
  if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function buildTask(
  id: string,
  createdAt: string,
  input: TaskInput,
): Task {
  const text = input.text.trim();
  if (!text) throw new TaskValidationError("Task text is required");
  assertStatusAgreement(input.status, input.completed);
  const status: TaskStatus =
    input.status ?? (input.completed === true ? "done" : "pending");
  const start = input.start ? normalizeTime(input.start) : "";
  const end = input.end ? normalizeTime(input.end) : "";
  assertTimeOrder(start, end);
  return toPublicTask({
    id,
    date: input.date,
    text,
    status,
    completed: status === "done",
    created_at: createdAt,
    start,
    end,
    first_step: input.first_step?.trim() ?? "",
    done_means: input.done_means?.trim() ?? "",
    timeSpent:
      input.timeSpent !== undefined && String(input.timeSpent).trim() !== ""
        ? String(input.timeSpent).trim()
        : "",
  });
}

export function applyTaskPatch(task: Task, patch: TaskPatch): Task {
  const next: Task = { ...task };
  if (patch.text !== undefined) {
    const text = patch.text.trim();
    if (!text) throw new TaskValidationError("Task text cannot be empty");
    next.text = text;
  }
  if (patch.date !== undefined) next.date = patch.date;
  if (patch.start !== undefined) {
    next.start = patch.start ? normalizeTime(patch.start) : "";
  }
  if (patch.end !== undefined) {
    next.end = patch.end ? normalizeTime(patch.end) : "";
  }
  if (patch.first_step !== undefined) next.first_step = patch.first_step.trim();
  if (patch.done_means !== undefined) next.done_means = patch.done_means.trim();
  if (patch.timeSpent !== undefined) {
    next.timeSpent =
      String(patch.timeSpent).trim() === "" ? "" : String(patch.timeSpent).trim();
  }
  if (patch.status !== undefined || patch.completed !== undefined) {
    assertStatusAgreement(patch.status, patch.completed);
    if (patch.status !== undefined) next.status = patch.status;
    else if (patch.completed === true) next.status = "done";
    else next.status = "pending";
  }
  assertTimeOrder(next.start, next.end);
  return toPublicTask(next);
}

export interface PlannedBlock {
  key: "pages" | "deep" | "plan" | "walk" | "read";
  start: number;
  end: number;
}

/**
 * Places a sample day around `nowMinutes` so one block contains "now"
 * whenever the clock is not on the last minute of the day.
 * Blocks that would fall outside the day are omitted.
 */
export function placePlan(nowMinutes: number): PlannedBlock[] {
  const last = 24 * 60 - 1;
  const anchor = Math.floor(nowMinutes / 5) * 5 - 15;
  const specs: {
    key: PlannedBlock["key"];
    delta: number;
    dur: number;
    current?: boolean;
  }[] = [
    { key: "pages", delta: -120, dur: 40 },
    { key: "deep", delta: -70, dur: 40 },
    { key: "plan", delta: 0, dur: 50, current: true },
    { key: "walk", delta: 65, dur: 30 },
    { key: "read", delta: 110, dur: 40 },
  ];

  const placed: PlannedBlock[] = [];
  for (const spec of specs) {
    let start = anchor + spec.delta;
    let end = start + spec.dur;
    if (spec.current) {
      if (start < 0) start = 0;
      if (end > last) end = last;
      if (nowMinutes < start || nowMinutes >= end) {
        start = Math.max(0, Math.min(nowMinutes - 10, last - 20));
        end = Math.min(last, Math.max(nowMinutes + 20, start + 20));
      }
      if (end <= start) {
        start = Math.max(0, nowMinutes);
        end = Math.min(last, start + 1);
      }
    } else if (start < 0 || end > last) {
      continue;
    }
    if (end <= start) continue;
    placed.push({ key: spec.key, start, end });
  }
  return placed;
}
