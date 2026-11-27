import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BatchCreateSchema,
  CreateTaskSchema,
  MAX_TASK_TEXT_LENGTH,
  UpdateTaskSchema,
  validateTaskData,
} from "./validation";

const date = "11/27/2026";

function note(paragraphs: string[]): string {
  return paragraphs.join("\n\n");
}

describe("task text length", () => {
  const reflection = note([
    "What I learned",
    "A".repeat(500),
    "The second paragraph is the part that used to be rejected.",
    "C".repeat(800),
  ]);

  it("accepts a note longer than the old 500 character cap", () => {
    assert.ok(reflection.length > 500);
    assert.ok(reflection.length < MAX_TASK_TEXT_LENGTH);

    const created = validateTaskData(CreateTaskSchema, {
      date,
      text: `  ${reflection}  `,
    });
    assert.equal(created.success, true);
    if (created.success) assert.equal(created.data.text, reflection);

    const updated = validateTaskData(UpdateTaskSchema, { text: reflection });
    assert.equal(updated.success, true);
    if (updated.success) assert.equal(updated.data.text, reflection);

    const batch = validateTaskData(BatchCreateSchema, {
      date,
      tasks: [{ text: reflection }, { text: "x".repeat(500) }],
    });
    assert.equal(batch.success, true);
    if (batch.success) {
      assert.equal(batch.data.tasks[0]?.text, reflection);
      assert.equal(batch.data.tasks[1]?.text.length, 500);
    }
  });

  it("accepts text at the sheet cell ceiling and rejects one character past it", () => {
    const ceiling = "n".repeat(MAX_TASK_TEXT_LENGTH);
    const accepted = validateTaskData(CreateTaskSchema, { date, text: ceiling });
    assert.equal(accepted.success, true);

    const rejected = validateTaskData(UpdateTaskSchema, {
      text: `${ceiling}!`,
    });
    assert.equal(rejected.success, false);
    if (!rejected.success) {
      assert.equal(
        rejected.error,
        `text: Task text must be ${MAX_TASK_TEXT_LENGTH} characters or fewer`,
      );
      assert.equal(rejected.error.includes("less than 500 characters"), false);
    }

    const batch = validateTaskData(BatchCreateSchema, {
      date,
      tasks: [{ text: "ok" }, { text: `${ceiling}!` }],
    });
    assert.equal(batch.success, false);
    if (!batch.success) {
      assert.equal(
        batch.error,
        `tasks.1.text: Task text must be ${MAX_TASK_TEXT_LENGTH} characters or fewer`,
      );
    }
  });

  it("still rejects empty text", () => {
    const created = validateTaskData(CreateTaskSchema, { date, text: "   " });
    assert.equal(created.success, false);
    if (!created.success) {
      assert.equal(created.error, "text: Task text is required");
    }

    const updated = validateTaskData(UpdateTaskSchema, { text: "" });
    assert.equal(updated.success, false);
    if (!updated.success) {
      assert.equal(updated.error, "text: Task text cannot be empty");
    }
  });
});
