"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createTask } from "@/lib/tasks";
import { CardStyle } from "@/app/page";

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
  cardStyle?: CardStyle;
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
  cardStyle = "line",
}: TodoCardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [textareaValue, setTextareaValue] = useState<string>("");
  const [isTextareaFocused, setIsTextareaFocused] = useState(false);

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

  // Update textarea value when tasks change or cardStyle changes (but not while user is typing)
  useEffect(() => {
    if (cardStyle === "textarea" && !isTextareaFocused) {
      const text = tasks
        .map((task) => (task.completed ? `✓ ${task.text}` : task.text))
        .join("\n");
      setTextareaValue(text);
    }
  }, [tasks, cardStyle, isTextareaFocused]);

  // Calculate empty slots to always have 11 rows total (cap tasks at 11 if more exist)
  const totalRows = 10;
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

  // Handle textarea changes for textarea style
  const handleTextareaChange = useCallback((value: string) => {
    setTextareaValue(value);
  }, []);

  // Handle textarea blur - save tasks from textarea
  const handleTextareaBlur = useCallback(async () => {
    setIsTextareaFocused(false);
    const lines = textareaValue.split("\n").filter((line) => line.trim());
    const newTasks: Task[] = [];
    const taskTextsInTextarea = new Set<string>();

    // Process each line in the textarea
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Check if line starts with ✓ (completed task)
      const isCompleted = trimmedLine.startsWith("✓");
      const taskText = isCompleted
        ? trimmedLine.substring(1).trim()
        : trimmedLine;

      if (!taskText) continue;
      taskTextsInTextarea.add(taskText);

      // Check if this task already exists
      const existingTask = tasks.find((t) => t.text === taskText);
      if (existingTask) {
        // Update completion status if changed, otherwise keep existing
        if (existingTask.completed !== isCompleted) {
          newTasks.push({ ...existingTask, completed: isCompleted });
        } else {
          newTasks.push(existingTask);
        }
      } else {
        // Create new task
        try {
          const createdTask = await createTask(taskText, date, isCompleted);
          newTasks.push(createdTask);
        } catch (error) {
          console.error("❌ Failed to save task:", error);
          // Add as temporary task anyway
          newTasks.push({
            id: `temp-${Date.now()}-${Math.random()}`,
            text: taskText,
            completed: isCompleted,
          });
        }
      }
    }

    // Update tasks - only keep tasks that are in the textarea
    setTasks(newTasks);
  }, [textareaValue, tasks, date]);

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
        "min-w-[400px] h-full shadow-lg bg-white transition-all ease-in-out duration-200",
        focused && "border-[1.5px]",
        focused && "border-[#4728F5]",
        !focused && "border border-gray-300 scale-95",
        className
      )}
    >
      <CardContent className="p-5 py-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <span className="w-4 h-4 rounded-full bg-[#F2F1ED] shadow-inner border-2"></span>
          <span className="text-xs text-gray-700">{date}</span>
          <span className="text-xs text-gray-700">{day}</span>
        </div>

        {/* Task List */}
        {cardStyle === "line" ? (
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
                        className="text-base font-sans text-gray-700 flex-1 bg-transparent border-none outline-none focus:outline-none placeholder:text-gray-300"
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            e.currentTarget.value.trim()
                          ) {
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
                    <div className="h-px bg-gray-300" />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <textarea
              value={textareaValue}
              onChange={(e) => handleTextareaChange(e.target.value)}
              onFocus={() => setIsTextareaFocused(true)}
              onBlur={handleTextareaBlur}
              placeholder="Type your tasks here, one per line. Use '✓' prefix for completed tasks."
              className="w-full flex-1 text-base font-mono text-gray-700 bg-transparent border-none outline-none focus:outline-none resize-none placeholder:text-gray-300"
              style={{ fontFamily: "inherit", minHeight: "400px" }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
