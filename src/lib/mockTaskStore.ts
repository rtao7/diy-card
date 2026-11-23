import { formatSheetDate, normalizeSheetDate } from "./dates";
import { TaskNotFoundError } from "./taskErrors";
import {
  applyTaskPatch,
  compareTasks,
  formatMinutes,
  placePlan,
  toPublicTask,
  type TaskPatch,
} from "./taskModel";
import type { Task, TaskStatus } from "./types";

/**
 * In-memory stand-in for the sheet. Used when credentials are not configured
 * (local dev) or when MOCK_SHEETS=true. Never used as a production fallback
 * unless that flag is set on purpose.
 */

interface MockState {
  tasks: Task[];
  seedVersion: number;
}

const SEED_VERSION = 1;

const g = globalThis as typeof globalThis & { __diyCardMock?: MockState };

function state(): MockState {
  if (!g.__diyCardMock || g.__diyCardMock.seedVersion !== SEED_VERSION) {
    const previous = g.__diyCardMock?.tasks ?? [];
    g.__diyCardMock = {
      seedVersion: SEED_VERSION,
      tasks: previous.filter((task) => !task.id.startsWith("task-seed-")),
    };
  }
  return g.__diyCardMock;
}

const COPY: Record<
  ReturnType<typeof placePlan>[number]["key"],
  { text: string; status: TaskStatus; first_step: string; done_means: string }
> = {
  pages: {
    text: "Morning pages",
    status: "done",
    first_step: "Open the notebook to a blank page",
    done_means: "Three pages, even if messy",
  },
  deep: {
    text: "Deep work",
    status: "slipped",
    first_step: "Put the phone in the other room",
    done_means: "One section drafted",
  },
  plan: {
    text: "Write tomorrow's plan",
    status: "pending",
    first_step: "Open yesterday's notes",
    done_means: "Tomorrow's blocks are in the sheet",
  },
  walk: {
    text: "Walk outside",
    status: "pending",
    first_step: "Put on shoes",
    done_means: "Back at the door",
  },
  read: {
    text: "Read",
    status: "pending",
    first_step: "Open the book to the bookmark",
    done_means: "Ten pages",
  },
};

function buildSeed(now: Date, date: string): Task[] {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  let blocks = placePlan(nowMinutes);
  const keys = new Set(blocks.map((block) => block.key));
  const extras: typeof blocks = [];
  if (!keys.has("pages")) extras.push({ key: "pages", start: 8 * 60, end: 8 * 60 + 40 });
  if (!keys.has("deep")) extras.push({ key: "deep", start: 9 * 60, end: 9 * 60 + 45 });
  if (extras.length > 0) {
    blocks = [...blocks, ...extras].sort((a, b) => a.start - b.start);
  }
  return blocks.map((block, index) => {
    const copy = COPY[block.key];
    return toPublicTask({
      id: `task-seed-${index + 1}`,
      date,
      text: copy.text,
      status: copy.status,
      completed: copy.status === "done",
      created_at: new Date(now.getTime() - (5 - index) * 60_000).toISOString(),
      start: formatMinutes(block.start),
      end: formatMinutes(block.end),
      first_step: copy.first_step,
      done_means: copy.done_means,
      timeSpent: "",
    });
  });
}

let seeded = false;

function ensureSeed(preferredDate?: string) {
  if (seeded && state().tasks.some((task) => task.id.startsWith("task-seed-"))) {
    return;
  }
  seeded = true;
  const now = new Date();
  const date = preferredDate
    ? normalizeSheetDate(preferredDate)
    : formatSheetDate(now);
  const store = state();
  if (store.tasks.some((task) => task.id.startsWith("task-seed-"))) return;
  store.tasks.push(...buildSeed(now, date));
}

function list(date: string): Task[] {
  const normalized = normalizeSheetDate(date);
  return state()
    .tasks.filter((task) => normalizeSheetDate(task.date) === normalized)
    .map((task) => toPublicTask({ ...task }))
    .sort(compareTasks);
}

export function mockListTasks(date: string): Task[] {
  ensureSeed(date);
  return list(date);
}

export function mockInsertTasks(tasks: Task[]): Task[] {
  ensureSeed();
  state().tasks.push(...tasks.map((task) => toPublicTask({ ...task })));
  return tasks.map((task) => toPublicTask(task));
}

export function mockUpdateTask(taskId: string, patch: TaskPatch): Task {
  ensureSeed();
  const tasks = state().tasks;
  const index = tasks.findIndex((task) => task.id === taskId);
  if (index === -1) throw new TaskNotFoundError();
  const next = applyTaskPatch(tasks[index], patch);
  tasks[index] = next;
  return next;
}

export function mockDeleteTask(taskId: string): void {
  ensureSeed();
  const tasks = state().tasks;
  const index = tasks.findIndex((task) => task.id === taskId);
  if (index === -1) throw new TaskNotFoundError();
  tasks.splice(index, 1);
}
