import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { rateLimiter } from "@/lib/rateLimiter";
import { compareTasks, type TaskInput, type TaskPatch } from "@/lib/taskModel";
import { createTask, deleteTask, getTasksForDate, updateTask } from "@/lib/tasks";
import type { Task, TaskStatus } from "@/lib/types";

export function useTasksQuery(date: string) {
  return useQuery({
    queryKey: ["tasks", date],
    queryFn: async () => {
      await rateLimiter.waitForRateLimit();
      return getTasksForDate(date);
    },
    enabled: !!date,
    staleTime: 15_000,
    refetchInterval: 60_000,
    retry: 1,
  });
}

export function useCreateTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: TaskInput) => createTask(input),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", task.date] });
    },
  });
}

function withStatus(task: Task, updates: TaskPatch): Task {
  let status: TaskStatus = task.status;
  if (updates.status) status = updates.status;
  else if (updates.completed === true) status = "done";
  else if (updates.completed === false) status = "pending";
  return {
    ...task,
    ...updates,
    status,
    completed: status === "done",
    start: updates.start !== undefined ? updates.start : task.start,
    end: updates.end !== undefined ? updates.end : task.end,
    first_step: updates.first_step ?? task.first_step,
    done_means: updates.done_means ?? task.done_means,
    timeSpent:
      updates.timeSpent !== undefined ? String(updates.timeSpent) : task.timeSpent,
  };
}

export function useUpdateTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      updates,
    }: {
      taskId: string;
      date: string;
      updates: TaskPatch;
    }) => updateTask(taskId, updates),
    onMutate: async ({ taskId, date, updates }) => {
      const key = ["tasks", date] as const;
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Task[]>(key);
      if (previous) {
        queryClient.setQueryData<Task[]>(
          key,
          previous
            .map((task) => (task.id === taskId ? withStatus(task, updates) : task))
            .sort(compareTasks),
        );
      }
      return { previous, date };
    },
    onError: (_error, _variables, context) => {
      if (!context) return;
      queryClient.setQueryData(["tasks", context.date], context.previous);
    },
    onSettled: (task, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", variables.date] });
      if (task?.date && task.date !== variables.date) {
        queryClient.invalidateQueries({ queryKey: ["tasks", task.date] });
      }
    },
  });
}

export function useDeleteTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
