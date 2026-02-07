import { z } from "zod";

/**
 * Schema for validating task data
 */
export const TaskSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{1,2}\/\d{1,2}\/\d{4}$/, {
    message: "Date must be in M/D/YYYY format (e.g., 12/25/2024)",
  }),
  text: z
    .string()
    .min(1, "Task text is required")
    .max(500, "Task text must be less than 500 characters"),
  completed: z.boolean(),
  created_at: z.string(),
  timeSpent: z.string().optional(),
});

/**
 * Schema for creating a new task (without id and created_at)
 */
export const CreateTaskSchema = z.object({
  date: z.string().regex(/^\d{1,2}\/\d{1,2}\/\d{4}$/, {
    message: "Date must be in M/D/YYYY format (e.g., 12/25/2024)",
  }),
  text: z
    .string()
    .min(1, "Task text is required")
    .max(500, "Task text must be less than 500 characters"),
  completed: z.boolean().optional().default(false),
  timeSpent: z.string().optional(),
});

/**
 * Schema for updating a task (all fields optional except validation rules when present)
 */
export const UpdateTaskSchema = z.object({
  date: z
    .string()
    .regex(/^\d{1,2}\/\d{1,2}\/\d{4}$/, {
      message: "Date must be in M/D/YYYY format (e.g., 12/25/2024)",
    })
    .optional(),
  text: z
    .string()
    .min(1, "Task text cannot be empty")
    .max(500, "Task text must be less than 500 characters")
    .optional(),
  completed: z.boolean().optional(),
  timeSpent: z.string().optional(),
});

/**
 * Helper to validate and parse data safely
 */
export function validateTaskData<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; error: string } {
  try {
    const parsed = schema.parse(data);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = (error as z.ZodError).issues[0];
      return {
        success: false,
        error: `${firstError.path.join(".")}: ${firstError.message}`,
      };
    }
    return { success: false, error: "Invalid data format" };
  }
}
