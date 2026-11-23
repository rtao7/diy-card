import { z } from "zod";
import { isRealSheetDate, normalizeSheetDate } from "./dates";
import {
  normalizeTime,
  parseTimeToMinutes,
  type TaskInput,
  type TaskPatch,
} from "./taskModel";
import type { TaskStatus } from "./types";

const DATE_MESSAGE = "Date must be M/D/YYYY, for example 11/24/2026";
const TIME_MESSAGE = "Time must be 24-hour HH:MM, for example 20:00";
const STATUS_MESSAGE = "status must be pending, done, or slipped";

export const DateField = z
  .string()
  .trim()
  .regex(/^\d{1,2}\/\d{1,2}\/\d{4}$/, DATE_MESSAGE)
  .transform((value) => normalizeSheetDate(value))
  .refine((value) => isRealSheetDate(value), "Date is not a real calendar day");

export const TimeField = z
  .string()
  .trim()
  .max(20)
  .refine(
    (value) => value === "" || parseTimeToMinutes(value) !== null,
    TIME_MESSAGE,
  )
  .transform((value) => (value === "" ? "" : normalizeTime(value)));

export const StatusField = z
  .string()
  .trim()
  .transform((value) => value.toLowerCase())
  .refine(
    (value): value is TaskStatus =>
      value === "pending" || value === "done" || value === "slipped",
    STATUS_MESSAGE,
  );

const shortText = (max: number) => z.string().trim().max(max);

const taskBodyShape = {
  text: z
    .string()
    .trim()
    .min(1, "Task text is required")
    .max(500, "Task text must be 500 characters or less"),
  completed: z.boolean().optional(),
  status: StatusField.optional(),
  start: TimeField.optional(),
  end: TimeField.optional(),
  first_step: shortText(200).optional(),
  firstStep: shortText(200).optional(),
  done_means: shortText(200).optional(),
  doneMeans: shortText(200).optional(),
  timeSpent: z.union([z.string().trim().max(40), z.number()]).optional(),
};

function addTimeAndStatusIssues(
  data: {
    start?: string;
    end?: string;
    status?: TaskStatus;
    completed?: boolean;
    first_step?: string;
    firstStep?: string;
    done_means?: string;
    doneMeans?: string;
  },
  ctx: {
    addIssue: (issue: {
      code: "custom";
      message: string;
      path: (string | number)[];
    }) => void;
  },
) {
  if (data.start && data.end) {
    const start = parseTimeToMinutes(data.start);
    const end = parseTimeToMinutes(data.end);
    if (start == null || end == null || end <= start) {
      ctx.addIssue({
        code: "custom",
        message: "end must be after start",
        path: ["end"],
      });
    }
  }
  if (data.status === "done" && data.completed === false) {
    ctx.addIssue({
      code: "custom",
      message: "status done conflicts with completed false",
      path: ["status"],
    });
  }
  if (data.status && data.status !== "done" && data.completed === true) {
    ctx.addIssue({
      code: "custom",
      message: `status ${data.status} conflicts with completed true`,
      path: ["status"],
    });
  }
  if (
    data.first_step !== undefined &&
    data.firstStep !== undefined &&
    data.first_step !== data.firstStep
  ) {
    ctx.addIssue({
      code: "custom",
      message: "first_step and firstStep disagree",
      path: ["first_step"],
    });
  }
  if (
    data.done_means !== undefined &&
    data.doneMeans !== undefined &&
    data.done_means !== data.doneMeans
  ) {
    ctx.addIssue({
      code: "custom",
      message: "done_means and doneMeans disagree",
      path: ["done_means"],
    });
  }
}

export const BatchTaskSchema = z
  .object(taskBodyShape)
  .superRefine(addTimeAndStatusIssues);

export const CreateTaskSchema = z
  .object({
    date: DateField,
    ...taskBodyShape,
  })
  .superRefine(addTimeAndStatusIssues);

export const UpdateTaskSchema = z
  .object({
    date: DateField.optional(),
    text: z
      .string()
      .trim()
      .min(1, "Task text cannot be empty")
      .max(500, "Task text must be 500 characters or less")
      .optional(),
    completed: z.boolean().optional(),
    status: StatusField.optional(),
    start: TimeField.optional(),
    end: TimeField.optional(),
    first_step: shortText(200).optional(),
    firstStep: shortText(200).optional(),
    done_means: shortText(200).optional(),
    doneMeans: shortText(200).optional(),
    timeSpent: z.union([z.string().trim().max(40), z.number()]).optional(),
  })
  .superRefine(addTimeAndStatusIssues);

export const BatchCreateSchema = z.object({
  date: DateField,
  tasks: z
    .array(BatchTaskSchema)
    .min(1, "Provide at least one task")
    .max(50, "Create at most 50 tasks at a time"),
});

export const StatusUpdateSchema = z.strictObject({
  status: StatusField,
});

type WithAliases = {
  text?: string;
  date?: string;
  completed?: boolean;
  status?: TaskStatus;
  start?: string;
  end?: string;
  first_step?: string;
  firstStep?: string;
  done_means?: string;
  doneMeans?: string;
  timeSpent?: string | number;
};

function aliases(data: WithAliases): Pick<TaskInput, "first_step" | "done_means"> {
  return {
    first_step: data.first_step ?? data.firstStep,
    done_means: data.done_means ?? data.doneMeans,
  };
}

export function toTaskInput(
  data: WithAliases & { text: string; date: string },
): TaskInput {
  return {
    text: data.text,
    date: data.date,
    status: data.status,
    completed: data.completed,
    start: data.start,
    end: data.end,
    timeSpent: data.timeSpent,
    ...aliases(data),
  };
}

export function toTaskPatch(data: WithAliases): TaskPatch {
  return {
    text: data.text,
    date: data.date,
    status: data.status,
    completed: data.completed,
    start: data.start,
    end: data.end,
    timeSpent: data.timeSpent,
    ...aliases(data),
  };
}

export function validateTaskData<T>(
  schema: z.ZodType<T>,
  data: unknown,
): { success: true; data: T } | { success: false; error: string } {
  const parsed = schema.safeParse(data);
  if (parsed.success) return { success: true, data: parsed.data };
  const first = parsed.error.issues[0];
  const path = first?.path?.length ? `${first.path.join(".")}: ` : "";
  return {
    success: false,
    error: `${path}${first?.message ?? "Invalid data"}`,
  };
}
