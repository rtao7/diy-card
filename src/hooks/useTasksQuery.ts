import { useQuery } from "@tanstack/react-query";
import { getTasksForDate } from "@/lib/tasks";
import { rateLimiter } from "@/lib/rateLimiter";

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
