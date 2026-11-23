import assert from "node:assert/strict";
import { decodeTaskRow, encodeRow, resolveLayout } from "../src/lib/sheetSchema";
import {
  applyTaskPatch,
  buildTask,
  compareTasks,
  normalizeTime,
  parseTimeToMinutes,
  placePlan,
  resolveStatus,
} from "../src/lib/taskModel";
import { normalizeSheetDate } from "../src/lib/dates";

function headersOf(layout: ReturnType<typeof resolveLayout>) {
  return layout.header;
}

const legacy = resolveLayout(
  ["id", "date", "text", "completed", "created_at"],
  [],
);
assert.equal(legacy.columns.start, 5, "start should be column F when the sheet ends at created_at");
assert.equal(legacy.columns.end, 6);
assert.equal(legacy.columns.status, 7);
assert.equal(legacy.columns.first_step, 8);
assert.equal(legacy.columns.done_means, 9);
assert.equal(legacy.timeSpentColumn, null);
assert.deepEqual(headersOf(legacy).slice(0, 10), [
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
]);

const withTimeSpent = resolveLayout(
  ["id", "date", "text", "completed", "created_at", "time_spent"],
  [],
);
assert.equal(withTimeSpent.timeSpentColumn, 5);
assert.equal(withTimeSpent.columns.start, 6);

const durationData = resolveLayout(
  ["id", "date", "text", "completed", "created_at"],
  [
    ["task-1", "11/1/2026", "Old", "true", "2026-11-01T00:00:00.000Z", "2h"],
    ["task-2", "11/1/2026", "Older", "false", "2026-11-01T00:00:00.000Z", "30m"],
  ],
);
assert.equal(durationData.timeSpentColumn, 5);
assert.equal(durationData.columns.start, 6);
assert.equal(durationData.header[5], "time_spent");

const named = resolveLayout(
  ["id", "date", "text", "completed", "created_at", "start", "end", "status", "first_step", "done_means"],
  [],
);
assert.equal(named.headerChanged, false);
assert.equal(named.columns.start, 5);

const notes = resolveLayout(
  ["id", "date", "text", "completed", "created_at", "notes"],
  [],
);
assert.equal(notes.columns.start, 6, "a labeled extra column should not be overwritten");
assert.equal(notes.header[5], "notes");

const oldDone = decodeTaskRow(
  ["task-1", "11/2/2026", "Call", "true", "2026-11-02T00:00:00.000Z"],
  legacy,
);
assert.equal(oldDone?.status, "done");
assert.equal(oldDone?.completed, true);
assert.equal(oldDone?.start, "");

const oldPending = decodeTaskRow(
  ["task-2", "11/02/2026", "Call", "FALSE", "2026-11-02T00:00:00.000Z"],
  legacy,
);
assert.equal(oldPending?.status, "pending");
assert.equal(oldPending?.date, "11/2/2026");

const slipped = decodeTaskRow(
  ["task-3", "11/2/2026", "Deep work", "false", "2026-11-02T00:00:00.000Z", "20:00", "20:45", "slipped", "Open the doc", "One section"],
  legacy,
);
assert.equal(slipped?.status, "slipped");
assert.equal(slipped?.completed, false);
assert.equal(slipped?.start, "20:00");
assert.equal(slipped?.end, "20:45");

const pm = decodeTaskRow(
  ["task-4", "11/2/2026", "Read", "false", "2026-11-02T00:00:00.000Z", "8:00 PM", "8:45:00 PM", "", "", ""],
  legacy,
);
assert.equal(pm?.start, "20:00");
assert.equal(pm?.end, "20:45");

assert.equal(resolveStatus("true", ""), "done");
assert.equal(resolveStatus("false", ""), "pending");
assert.equal(resolveStatus("true", "slipped"), "slipped");
assert.equal(normalizeTime("8:05 PM"), "20:05");
assert.equal(parseTimeToMinutes("24:00"), null);

const encoded = encodeRow(undefined, slipped!, legacy);
assert.equal(encoded[3], "false");
assert.equal(encoded[7], "slipped");
assert.equal(encoded[5], "20:00");

const roundTrip = decodeTaskRow(encoded, legacy);
assert.equal(roundTrip?.status, "slipped");
assert.equal(roundTrip?.first_step, "Open the doc");

const task = buildTask("task-9", "2026-11-23T00:00:00.000Z", {
  date: "11/23/2026",
  text: "Write",
  start: "20:00",
  end: "20:45",
  first_step: "Open notes",
  done_means: "Outline exists",
});
assert.equal(task.status, "pending");
assert.equal(task.completed, false);
const done = applyTaskPatch(task, { status: "done" });
assert.equal(done.status, "done");
assert.equal(done.completed, true);
const back = applyTaskPatch(done, { completed: false });
assert.equal(back.status, "pending");
assert.throws(() => applyTaskPatch(task, { status: "slipped", completed: true }));
assert.throws(() => buildTask("x", "2026-11-23T00:00:00.000Z", {
  date: "11/23/2026",
  text: "Bad",
  start: "21:00",
  end: "20:00",
}));

const ordered = [task, { ...task, id: "earlier", start: "09:00", end: "09:30" }, { ...task, id: "untimed", start: "", end: "" }].sort(compareTasks);
assert.deepEqual(ordered.map((item) => item.id), ["earlier", "task-9", "untimed"]);

for (const minutes of [0, 6 * 60 + 2, 12 * 60, 18 * 60, 23 * 60 + 40]) {
  const plan = placePlan(minutes);
  const current = plan.find((block) => block.key === "plan");
  assert.ok(current, `plan block missing at ${minutes}`);
  assert.ok(
    minutes >= current.start && minutes < current.end,
    `now ${minutes} not inside ${current.start}-${current.end}`,
  );
}

assert.equal(normalizeSheetDate("2026-11-04"), "11/4/2026");
assert.equal(normalizeSheetDate("11/04/2026"), "11/4/2026");

console.log("task model checks passed");
