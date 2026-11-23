import { createGoogleTaskStore } from "./googleTaskStore";
import { createSeededMemoryStore } from "./memoryTaskStore";
import { Task, TaskInput, TaskPatch, TaskStatus } from "./taskModel";

export interface TaskStore {
  listByDate(date: string): Promise<Task[]>;
  createMany(inputs: TaskInput[]): Promise<Task[]>;
  update(id: string, patch: TaskPatch): Promise<Task>;
  updateStatus(id: string, status: TaskStatus): Promise<Task>;
  delete(id: string): Promise<void>;
}

export function sheetsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID &&
      (process.env.GOOGLE_SHEETS_CREDENTIALS_BASE64 ||
        process.env.GOOGLE_SHEETS_CREDENTIALS_JSON ||
        process.env.GOOGLE_SHEETS_CREDENTIALS),
  );
}

/**
 * The in-memory sheet is for local development and tests.
 * Production uses Google Sheets whenever credentials exist.
 * Set GOOGLE_SHEETS_MOCK=1 to force the memory sheet, or 0 to force Sheets.
 */
export function shouldMockSheets(): boolean {
  if (process.env.GOOGLE_SHEETS_MOCK === "1") return true;
  if (process.env.GOOGLE_SHEETS_MOCK === "0") return false;
  if (process.env.NODE_ENV === "production") return false;
  return !sheetsConfigured();
}

const globalStore = globalThis as typeof globalThis & {
  __diyCardTaskStore?: TaskStore;
};

export function getTaskStore(): TaskStore {
  if (!globalStore.__diyCardTaskStore) {
    globalStore.__diyCardTaskStore = shouldMockSheets()
      ? createSeededMemoryStore()
      : createGoogleTaskStore();
  }
  return globalStore.__diyCardTaskStore;
}

export function resetTaskStoreForTests(store?: TaskStore) {
  globalStore.__diyCardTaskStore = store;
}
