import { z } from "zod";
import { rangeError } from "./taskModel";

const dateSchema = z.string().regex(/^\d{1,2}\/\d{1,2}\/\d{4}$/, {
  message: "Date must be in M/D/YYYY format (e.g., 12/25/2024)",
});

const clockSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, {
  message: "Time must be HH:MM in 24-hour form (e.g., 20:00)",
});

const noteSchema = z.string().max(280, "Must be 280 characters or fewer");

export const TaskStatusSchema = z.enum(["pending", "done", "slipped"]);

/**
 * One block. `completed` is the legacy boolean: true means done, false means pending.
 * `status` wins when both are sent.
 */
export const CreateTaskSchema = z.object({
  date: dateSchema,
  text: z
    .string()
    .trim()
    .min(1, "Task text is required")
    .max(500, "Task text must be less than 500 characters"),
  completed: z.boolean().optional(),
  status: TaskStatusSchema.optional(),
  start: clockSchema.optional(),
  end: clockSchema.optional(),
  first_step: noteSchema.optional(),
  done_means: noteSchema.optional(),
});

export const CreateTaskBodySchema = CreateTaskSchema.omit({ date: true }).extend({
  date: dateSchema.optional(),
});

export const BatchCreateSchema = z.object({
  date: dateSchema,
  tasks: z
    .array(CreateTaskBodySchema)
    .min(1, "Provide at least one task")
    .max(40, "A day can take at most 40 tasks at once"),
});

export const UpdateTaskSchema = z.object({
  date: dateSchema.optional(),
  text: z
    .string()
    .trim()
    .min(1, "Task text cannot be empty")
    .max(500, "Task text must be less than 500 characters")
    .optional(),
  completed: z.boolean().optional(),
  status: TaskStatusSchema.optional(),
  start: clockSchema.optional(),
  end: clockSchema.optional(),
  first_step: noteSchema.optional(),
  done_means: noteSchema.optional(),
});

export const UpdateStatusSchema = z.object({
  status: TaskStatusSchema,
});

export function validateTaskData<T>(
  schema: z.ZodType<T>,
  data: unknown,
): { success: true; data: T } | { success: false; error: string } {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    const path = firstError.path.join(".");
    const prefix = path ? `${path}: ` : "";
    return { success: false, error: `${prefix}${firstError.message}` };
  }
  return { success: true, data: parsed.data };
}

export function timeRangeError(start?: string, end?: string): string | null {
  return rangeError(start, end);
}
