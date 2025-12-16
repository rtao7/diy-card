"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createTask } from "@/lib/tasks";

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

interface TodoCardProps {
  date: string;
  day: string;
  tasks: Task[];
  emptySlots?: number;
  className?: string;
  faded?: boolean;
  focused?: boolean;
}

// Diamond icon component
const DiamondIcon = ({
  completed,
  onClick,
}: {
  completed: boolean;
  onClick?: () => void;
}) => {
  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;

  if (completed) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
        aria-label="Mark as incomplete"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M8 0L16 8L8 16L0 8L8 0Z" fill={`url(#${gradientId})`} />
          <defs>
            <linearGradient
              id={gradientId}
              x1="0"
              y1="0"
              x2="16"
              y2="0"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#9333EA" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
          </defs>
        </svg>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 cursor-pointer hover:opacity-60 transition-opacity"
      aria-label="Mark as complete"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M8 0L16 8L8 16L0 8L8 0Z"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          className="text-gray-300"
        />
      </svg>
    </button>
  );
};

export function TodoCard({
  date,
  day,
  tasks: initialTasks,
  emptySlots,
  className,
  faded = false,
  focused = false,
}: TodoCardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  // Update tasks when initialTasks prop changes (when new data is fetched from API)
  useEffect(() => {
    console.log("🔄 TodoCard: Updating tasks from prop", {
      date,
      initialTasksCount: initialTasks.length,
      initialTasks,
    });
    setTasks(initialTasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTasks, date]);

  // Calculate empty slots to always have 11 rows total (cap tasks at 11 if more exist)
  const totalRows = 11;
  const displayedTasks = tasks.slice(0, totalRows);
  const calculatedEmptySlots =
    emptySlots !== undefined
      ? emptySlots
      : Math.max(0, totalRows - displayedTasks.length);

  const toggleTask = useCallback((taskId: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  }, []);

  const addTask = useCallback(
    async (text: string, insertIndex: number) => {
      if (!text.trim()) return;

      const trimmedText = text.trim();

      // Optimistically add task to UI immediately
      const tempId = `temp-${Date.now()}-${insertIndex}`;
      const optimisticTask: Task = {
        id: tempId,
        text: trimmedText,
        completed: false,
      };

      setTasks((prevTasks) => {
        // Insert at the position where the empty slot was
        // For empty slots, insertIndex should be >= prevTasks.length
        // We'll insert at the end (prevTasks.length) to maintain order
        const insertPos = Math.min(insertIndex, prevTasks.length);
        const newTasks = [...prevTasks];
        newTasks.splice(insertPos, 0, optimisticTask);
        return newTasks;
      });

      // Save to spreadsheet via API
      try {
        const createdTask = await createTask(trimmedText, date, false);

        // Replace the temporary task with the real one from the server
        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task.id === tempId
              ? {
                  id: createdTask.id,
                  text: createdTask.text,
                  completed: createdTask.completed,
                }
              : task
          )
        );

        console.log("✅ Task saved to spreadsheet:", createdTask);
      } catch (error) {
        console.error("❌ Failed to save task to spreadsheet:", error);

        // Remove the optimistic task on error
        setTasks((prevTasks) => prevTasks.filter((task) => task.id !== tempId));

        // You could show an error toast here if you have a toast system
        alert("Failed to save task. Please try again.");
      }
    },
    [date]
  );

  const updateTaskText = useCallback((taskId: string, text: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => (task.id === taskId ? { ...task, text } : task))
    );
  }, []);

  // Create all items: existing tasks + empty slots (always 11 rows total)
  const allItems: (Task | { id: string; isEmpty: true })[] = [
    ...displayedTasks,
    ...Array(calculatedEmptySlots)
      .fill(null)
      .map((_, i) => ({
        id: `empty-${i}`,
        isEmpty: true as const,
      })),
  ];

  return (
    <Card
      className={cn(
        "min-w-[400px] h-full shadow-lg bg-white",
        focused && "border-2",
        focused && "border-[#4728F5]",
        !focused && "border border-gray-200",
        className
      )}
    >
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <span className="text-base font-serif text-gray-700">{date}</span>
          <span className="text-base font-serif text-gray-700">{day}</span>
        </div>

        {/* Task List */}
        <div className="space-y-0">
          {allItems.map((item, index) => {
            const isTask = "isEmpty" in item === false;
            const task = isTask ? (item as Task) : null;

            return (
              <div key={item.id}>
                <div className="flex items-center gap-3 py-2.5">
                  <DiamondIcon
                    completed={task?.completed ?? false}
                    onClick={() => task && toggleTask(task.id)}
                  />
                  {isTask && task ? (
                    <span
                      className={cn(
                        "text-base font-mono text-gray-700 flex-1",
                        task.completed && "line-through text-gray-400"
                      )}
                    >
                      {task.text}
                    </span>
                  ) : (
                    <input
                      type="text"
                      placeholder=""
                      className="text-base font-mono text-gray-700 flex-1 bg-transparent border-none outline-none focus:outline-none placeholder:text-gray-300"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.currentTarget.value.trim()) {
                          addTask(e.currentTarget.value, index);
                          e.currentTarget.value = "";
                        }
                      }}
                      onBlur={(e) => {
                        if (e.currentTarget.value.trim()) {
                          addTask(e.currentTarget.value, index);
                          e.currentTarget.value = "";
                        }
                      }}
                    />
                  )}
                </div>
                {index < allItems.length - 1 && (
                  <div className="h-px bg-gray-200" />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
