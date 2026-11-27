import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMemoryTaskStore } from "./memoryTaskStore";
import {
  buildDemoSchedule,
  clockToMinutes,
  currentTaskId,
  demoScheduleOverlaps,
  demoTasks,
  formatSheetDate,
  hasTimeRange,
  nowMinutes,
  nowPlacement,
  parseClock,
  rowToTask,
  sortTasks,
  splitTaskText,
  statusFromCells,
  taskToRow,
  TASK_TITLE_MAX_LENGTH,
  type Task,
} from "./taskModel";

function row(cells: string[]): string[] {
  return cells;
}

describe("legacy sheet rows", () => {
  it("maps completed true to done when status is empty", () => {
    const task = rowToTask(
      row(["a", "12/25/2024", "Write", "true", "2024-12-25T00:00:00.000Z"]),
    );
    assert.ok(task);
    assert.equal(task.status, "done");
    assert.equal(task.completed, true);
    assert.equal(task.start, "");
    assert.equal(task.end, "");
  });

  it("maps completed false to pending", () => {
    const task = rowToTask(
      row(["a", "1/2/2024", "Write", "false", "2024-01-02T00:00:00.000Z"]),
    );
    assert.equal(task?.status, "pending");
    assert.equal(task?.completed, false);
  });

  it("lets an explicit status win over the completed cell", () => {
    const task = rowToTask(
      row([
        "a",
        "1/2/2024",
        "Write",
        "true",
        "2024-01-02T00:00:00.000Z",
        "",
        "",
        "slipped",
      ]),
    );
    assert.ok(task);
    assert.equal(task.status, "slipped");
    assert.equal(task.completed, false);
  });

  it("ignores a legacy time_spent value that is not a clock time", () => {
    const task = rowToTask(
      row(["a", "1/2/2024", "Write", "false", "2024-01-02T00:00:00.000Z", "30"]),
    );
    assert.equal(task?.start, "");
    assert.equal(statusFromCells("TRUE", ""), "done");
    assert.equal(statusFromCells("no", ""), "pending");
  });

  it("reads the new columns and writes them back in order", () => {
    const task = rowToTask(
      row([
        "a",
        "11/24/2026",
        "Deep work",
        "false",
        "2026-11-23T00:00:00.000Z",
        "20:00",
        "20:45",
        "pending",
        "Open the doc",
        "Section sent",
      ]),
    );
    assert.deepEqual(taskToRow(task as Task), [
      "a",
      "11/24/2026",
      "Deep work",
      "false",
      "2026-11-23T00:00:00.000Z",
      "20:00",
      "20:45",
      "pending",
      "Open the doc",
      "Section sent",
    ]);
  });
});

describe("clock parsing", () => {
  it("normalizes sheets time formats to HH:MM", () => {
    assert.equal(parseClock("20:00"), "20:00");
    assert.equal(parseClock("8:05"), "08:05");
    assert.equal(parseClock("20:00:00"), "20:00");
    assert.equal(parseClock("8:05 PM"), "20:05");
    assert.equal(parseClock("12:00 AM"), "00:00");
    assert.equal(parseClock("12:30 PM"), "12:30");
    assert.equal(parseClock("2h"), "");
    assert.equal(parseClock(""), "");
  });
});

describe("timeline order and now", () => {
  const tasks: Task[] = [
    {
      id: "late",
      date: "11/23/2026",
      text: "Late",
      completed: false,
      created_at: "2026-11-23T00:00:02.000Z",
      start: "21:00",
      end: "21:30",
      status: "pending",
      first_step: "",
      done_means: "",
    },
    {
      id: "open",
      date: "11/23/2026",
      text: "Anytime",
      completed: false,
      created_at: "2026-11-23T00:00:00.000Z",
      start: "",
      end: "",
      status: "pending",
      first_step: "",
      done_means: "",
    },
    {
      id: "early",
      date: "11/23/2026",
      text: "Early",
      completed: true,
      created_at: "2026-11-23T00:00:01.000Z",
      start: "09:00",
      end: "09:30",
      status: "done",
      first_step: "",
      done_means: "",
    },
  ];

  it("orders timed blocks by start and leaves untimed last", () => {
    assert.deepEqual(
      sortTasks(tasks).map((task) => task.id),
      ["early", "late", "open"],
    );
  });

  it("highlights the block that contains now", () => {
    const now = new Date(2026, 10, 23, 21, 10, 0);
    assert.equal(currentTaskId(tasks, now), "late");
    assert.equal(nowPlacement(tasks, now).kind, "inside");
    const before = new Date(2026, 10, 23, 8, 0, 0);
    assert.equal(nowPlacement(tasks, before).kind, "before");
    const after = new Date(2026, 10, 23, 22, 0, 0);
    assert.equal(nowPlacement(tasks, after).kind, "after");
  });
});

describe("mock sheet", () => {
  it("creates several tasks for a date and updates one status", async () => {
    const store = createMemoryTaskStore([
      rowToTask(["old", "1/2/2024", "Legacy", "true", "2024-01-02T00:00:00.000Z"]) as Task,
    ]);

    const legacy = await store.listByDate("1/2/2024");
    assert.equal(legacy[0]?.status, "done");

    const created = await store.createMany([
      {
        date: "11/24/2026",
        text: "Deep work",
        start: "20:00",
        end: "20:45",
        first_step: "Open the doc",
        done_means: "Section sent",
      },
      {
        date: "11/24/2026",
        text: "Walk",
        start: "21:00",
        end: "21:30",
      },
    ]);
    assert.equal(created.length, 2);

    const day = await store.listByDate("11/24/2026");
    assert.deepEqual(
      day.map((task) => task.text),
      ["Deep work", "Walk"],
    );
    assert.equal(day[0]?.status, "pending");
    assert.equal(day[0]?.completed, false);

    const slipped = await store.updateStatus(created[1].id, "slipped");
    assert.equal(slipped.status, "slipped");
    assert.equal(slipped.completed, false);

    const done = await store.updateStatus(created[0].id, "done");
    assert.equal(done.completed, true);
    assert.equal(taskToRow(done)[3], "true");
    assert.equal(taskToRow(done)[7], "done");

    await assert.rejects(() => store.updateStatus("missing", "done"), /Task not found/);
  });

  it("keeps a multi-paragraph note intact through create and update", async () => {
    const note = [
      "What I learned",
      "",
      "The first pass treated the block as a title. ".repeat(20).trim(),
      "",
      "A second paragraph should stay in the same entry, including this long token:",
      "https://example.com/" + "segment/".repeat(30),
    ].join("\n");
    assert.ok(note.length > 500);

    const store = createMemoryTaskStore();
    const [created] = await store.createMany([
      { date: "11/27/2026", text: `  ${note}  ` },
    ]);
    assert.equal(created.text, note);

    const listed = await store.listByDate("11/27/2026");
    assert.equal(listed[0]?.text, note);

    const extra = `${note}\n\nOne more line after the edit.`;
    const updated = await store.update(created.id, { text: extra });
    assert.equal(updated.text, extra);
    assert.equal((await store.listByDate("11/27/2026"))[0]?.text, extra);
  });

  it("seeds a day with a current block, one done, and one slipped", () => {
    for (const hour of [0, 6, 12, 18, 23]) {
      const now = new Date(2026, 10, 23, hour, 10, 0);
      const drafts = buildDemoSchedule(now);
      assert.equal(demoScheduleOverlaps(now), false, `overlap at ${hour}`);
      assert.ok(
        drafts.some((draft) => draft.status === "done"),
        `done at ${hour}`,
      );
      assert.ok(
        drafts.some((draft) => draft.status === "slipped"),
        `slipped at ${hour}`,
      );
      const minute = nowMinutes(now);
      const current = drafts.filter(
        (draft) => minute >= draft.start && minute < draft.end,
      );
      assert.equal(current.length, 1, `current count at ${hour}`);
      assert.equal(current[0]?.text, "Deep work");
    }

    const tasks = demoTasks(new Date(2026, 10, 23, 9, 0, 0));
    assert.ok(tasks.every((task) => hasTimeRange(task)));
    assert.equal(tasks[0]?.date, formatSheetDate(new Date(2026, 10, 23, 9, 0, 0)));
    assert.ok(tasks.some((task) => clockToMinutes(task.start) != null));
  });
});

describe("task text layout", () => {
  it("keeps a short block as a title", () => {
    assert.deepEqual(splitTaskText("Deep work"), {
      title: "Deep work",
      body: "",
    });
    assert.deepEqual(splitTaskText("x".repeat(TASK_TITLE_MAX_LENGTH)), {
      title: "x".repeat(TASK_TITLE_MAX_LENGTH),
      body: "",
    });
  });

  it("lays a longer single paragraph out as a note", () => {
    const text = "x".repeat(TASK_TITLE_MAX_LENGTH + 1);
    assert.deepEqual(splitTaskText(text), { title: "", body: text });
  });

  it("keeps every paragraph of a note, with a short first line as the title", () => {
    const body = [
      "The constraint was the cell, not the idea.",
      "",
      "I want the reflection in the same entry.",
    ].join("\n");
    const text = `What I learned\n\n${body}`;
    const parts = splitTaskText(text);
    assert.equal(parts.title, "What I learned");
    assert.equal(parts.body, body);
    assert.equal(parts.body.includes("\n\n"), true);
  });

  it("does not drop a note whose first line is already a paragraph", () => {
    const text = `${"word ".repeat(120).trim()}\n\nSecond paragraph.`;
    const parts = splitTaskText(text);
    assert.equal(parts.title, "");
    assert.equal(parts.body, text);
  });

  it("normalizes Windows newlines without losing lines", () => {
    assert.deepEqual(splitTaskText("Title\r\n\r\nLine two\r\nLine three"), {
      title: "Title",
      body: "Line two\nLine three",
    });
  });
});
