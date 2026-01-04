import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTasksForDate, updateTask, deleteTask, createTask } from "@/lib/tasks";
import { rateLimiter } from "@/lib/rateLimiter";

interface Task {
  id: string;
  text: string;
  completed: boolean;
  date?: string;
  created_at?: string;
  timeSpent?: string | number;
}

/**
 * React Query hook for fetching tasks for a specific date
 */
export function useTasksQuery(date: string) {
  return useQuery({
    queryKey: ["tasks", date],
    queryFn: async () => {
      // Use rate limiter before making request
      await rateLimiter.waitForRateLimit();
      return getTasksForDate(date);
    },
    enabled: !!date,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * React Query mutation for creating a task
 */
export function useCreateTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      text,
      date,
      completed,
      timeSpent,
    }: {
      text: string;
      date: string;
      completed?: boolean;
      timeSpent?: string | number;
    }) => createTask(text, date, completed ?? false, timeSpent),
    onSuccess: (task, variables) => {
      // Invalidate and refetch tasks for the date
      queryClient.invalidateQueries({ queryKey: ["tasks", variables.date] });
    },
  });
}

/**
 * React Query mutation for updating a task
 */
export function useUpdateTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      updates,
    }: {
      taskId: string;
      updates: { text?: string; completed?: boolean; date?: string; timeSpent?: string | number };
    }) => updateTask(taskId, updates),
    onSuccess: (task) => {
      // Invalidate queries for both old and new dates
      if (task.date) {
        queryClient.invalidateQueries({ queryKey: ["tasks", task.date] });
      }
    },
  });
}

/**
 * React Query mutation for deleting a task
 */
export function useDeleteTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onSuccess: () => {
      // Invalidate all task queries since we don't know which date
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

