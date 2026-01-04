import { useState, useRef, useEffect, useCallback } from "react";
import { getTasksForDate } from "@/lib/tasks";
import { rateLimiter } from "@/lib/rateLimiter";

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

/**
 * Custom hook for fetching tasks with caching and rate limiting
 */
export function useTaskFetcher() {
  const [tasksCache, setTasksCache] = useState<
    Record<string, Task[]>
  >({});
  const [loadingDates, setLoadingDates] = useState<Set<string>>(new Set());

  // Use refs to track current state to avoid stale closures
  const tasksCacheRef = useRef(tasksCache);
  const loadingDatesRef = useRef(loadingDates);

  // Keep refs in sync with state
  useEffect(() => {
    tasksCacheRef.current = tasksCache;
  }, [tasksCache]);

  useEffect(() => {
    loadingDatesRef.current = loadingDates;
  }, [loadingDates]);

  /**
   * Fetches tasks for a specific date
   */
  const fetchTasksForDate = useCallback(async (dateString: string) => {
    // Don't fetch if we already have the tasks or are currently loading
    if (tasksCacheRef.current[dateString]) {
      return tasksCacheRef.current[dateString];
    }

    if (loadingDatesRef.current.has(dateString)) {
      return undefined; // Already loading
    }

    // Wait for rate limit before making request
    await rateLimiter.waitForRateLimit();

    // Mark as loading
    setLoadingDates((prev) => new Set(prev).add(dateString));

    try {
      // Fetch tasks from API
      const tasks = await getTasksForDate(dateString);

      // Store in cache
      setTasksCache((prev) => ({
        ...prev,
        [dateString]: tasks,
      }));

      return tasks;
    } catch (error: any) {
      console.error(`❌ Error fetching tasks for ${dateString}:`, error);

      // If it's a quota error, don't store empty array - we'll retry later
      const isQuotaError =
        error?.message?.includes("Quota exceeded") ||
        error?.apiError?.details?.includes("Quota exceeded");

      if (!isQuotaError) {
        // Store empty array on other errors so we don't keep trying
        setTasksCache((prev) => ({
          ...prev,
          [dateString]: [],
        }));
      }

      throw error;
    } finally {
      // Remove from loading set
      setLoadingDates((prev) => {
        const next = new Set(prev);
        next.delete(dateString);
        return next;
      });
    }
  }, []);

  /**
   * Gets tasks from cache (returns undefined if not cached)
   */
  const getCachedTasks = useCallback(
    (dateString: string): Task[] | undefined => {
      return tasksCacheRef.current[dateString];
    },
    []
  );

  /**
   * Checks if a date is currently loading
   */
  const isLoading = useCallback(
    (dateString: string): boolean => {
      return loadingDatesRef.current.has(dateString);
    },
    []
  );

  /**
   * Invalidates cache for a specific date (forces refetch)
   */
  const invalidateCache = useCallback((dateString: string) => {
    setTasksCache((prev) => {
      const next = { ...prev };
      delete next[dateString];
      return next;
    });
  }, []);

  /**
   * Updates a task in the cache
   */
  const updateTaskInCache = useCallback(
    (dateString: string, taskId: string, updates: Partial<Task>) => {
      setTasksCache((prev) => {
        const cached = prev[dateString];
        if (!cached) return prev;

        return {
          ...prev,
          [dateString]: cached.map((task) =>
            task.id === taskId ? { ...task, ...updates } : task
          ),
        };
      });
    },
    []
  );

  /**
   * Adds a task to the cache
   */
  const addTaskToCache = useCallback(
    (dateString: string, task: Task) => {
      setTasksCache((prev) => {
        const cached = prev[dateString] || [];
        return {
          ...prev,
          [dateString]: [...cached, task],
        };
      });
    },
    []
  );

  /**
   * Removes a task from the cache
   */
  const removeTaskFromCache = useCallback(
    (dateString: string, taskId: string) => {
      setTasksCache((prev) => {
        const cached = prev[dateString];
        if (!cached) return prev;

        return {
          ...prev,
          [dateString]: cached.filter((task) => task.id !== taskId),
        };
      });
    },
    []
  );

  return {
    tasksCache,
    fetchTasksForDate,
    getCachedTasks,
    isLoading,
    invalidateCache,
    updateTaskInCache,
    addTaskToCache,
    removeTaskFromCache,
  };
}

