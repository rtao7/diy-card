import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTasksForDate, updateTaskStatus } from "@/lib/tasks";
import { rateLimiter } from "@/lib/rateLimiter";
import { Task, TaskStatus } from "@/lib/types";

export function useTasksQuery(date: string) {
  return useQuery({
    queryKey: ["tasks", date],
    queryFn: async () => {
      await rateLimiter.waitForRateLimit();
      return getTasksForDate(date);
    },
    enabled: !!date,
    staleTime: 30_000,
  });
}

export function useUpdateStatusMutation(date: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      updateTaskStatus(taskId, status),
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks", date] });
      const previous = queryClient.getQueryData<Task[]>(["tasks", date]);
      queryClient.setQueryData<Task[]>(["tasks", date], (current = []) =>
        current.map((task) =>
          task.id === taskId
            ? { ...task, status, completed: status === "done" }
            : task,
        ),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["tasks", date], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", date] });
    },
  });
}
