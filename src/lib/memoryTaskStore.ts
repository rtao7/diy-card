import {
  applyPatch,
  demoTasks,
  inputToTask,
  sortTasks,
  Task,
} from "./taskModel";
import type { TaskStore } from "./taskStore";

function notFound(): Error {
  return new Error("Task not found");
}

/**
 * In-memory stand-in for the Google Sheet.
 * `initial` rows are copied so callers can keep their own fixtures.
 */
export function createMemoryTaskStore(initial: Task[] = []): TaskStore {
  const tasks: Task[] = initial.map((task) => ({ ...task }));

  const store: TaskStore = {
    async listByDate(date) {
      return sortTasks(tasks.filter((task) => task.date === date));
    },

    async createMany(inputs) {
      const created = inputs.map((input, index) => inputToTask(input, index));
      tasks.push(...created);
      return created;
    },

    async update(id, patch) {
      const index = tasks.findIndex((task) => task.id === id);
      if (index === -1) throw notFound();
      const next = applyPatch(tasks[index], patch);
      tasks[index] = next;
      return next;
    },

    async updateStatus(id, status) {
      return store.update(id, { status });
    },

    async delete(id) {
      const index = tasks.findIndex((task) => task.id === id);
      if (index === -1) throw notFound();
      tasks.splice(index, 1);
    },
  };

  return store;
}

export function createSeededMemoryStore(now = new Date()): TaskStore {
  return createMemoryTaskStore(demoTasks(now));
}
