"use client";

import { useCallback, useState, memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useUpdateStatusMutation,
} from "@/hooks/useTasksQuery";
import { CardStyle } from "@/app/page";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Task, TaskStatus } from "@/lib/types";
import { formatRange } from "@/lib/taskModel";
import { StatusToggle } from "@/components/day/StatusToggle";

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

function lineFor(task: Task): string {
  if (task.status === "done") return `✓ ${task.text}`;
  if (task.status === "slipped") return `~ ${task.text}`;
  return task.text;
}

function statusFromLine(line: string): { status: TaskStatus; text: string } {
  const trimmed = line.trim();
  if (trimmed.startsWith("✓")) {
    return { status: "done", text: trimmed.slice(1).trim() };
  }
  if (trimmed.startsWith("~")) {
    return { status: "slipped", text: trimmed.slice(1).trim() };
  }
  return { status: "pending", text: trimmed };
}

/**
 * The diamond is the original row mark. Its ink comes from the gray scale:
 * outline while pending, filled when done, dashed when slipped.
 */
function DiamondIcon({
  status,
  open,
  onClick,
}: {
  status: TaskStatus;
  open: boolean;
  onClick?: () => void;
}) {
  const label =
    status === "done" ? "Done" : status === "slipped" ? "Slipped" : "Pending";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={`${label}. Change status`}
      className="shrink-0 cursor-pointer hover:opacity-80 transition-opacity duration-[var(--duration-fast)]"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        {status === "done" ? (
          <path d="M8 0L16 8L8 16L0 8L8 0Z" fill="var(--gray-700)" />
        ) : (
          <path
            d="M8 0L16 8L8 16L0 8L8 0Z"
            stroke="var(--neutral-300)"
            strokeWidth="1.5"
            strokeDasharray={status === "slipped" ? "2.4 2" : undefined}
            fill="none"
          />
        )}
      </svg>
    </button>
  );
}

export const TodoCard = memo(function TodoCard({
  date,
  day,
  tasks: initialTasks,
  emptySlots,
  className,
  focused = false,
  cardStyle = "line",
}: TodoCardProps) {
  const tasks = initialTasks;
  const [draft, setDraft] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const createMutation = useCreateTaskMutation();
  const updateMutation = useUpdateTaskMutation();
  const deleteMutation = useDeleteTaskMutation();
  const statusMutation = useUpdateStatusMutation(date);

  const textareaValue =
    draft ?? tasks.map((task) => lineFor(task)).join("\n");

  const totalRows = 10;
  const displayedTasks = tasks.slice(0, totalRows);
  const calculatedEmptySlots =
    emptySlots !== undefined
      ? emptySlots
      : Math.max(0, totalRows - displayedTasks.length);

  const setStatus = useCallback(
    (taskId: string, status: TaskStatus) => {
      statusMutation.mutate(
        { taskId, status },
        {
          onError: () => {
            toast.error("Failed to update status. Please try again.");
          },
        },
      );
    },
    [statusMutation],
  );

  const addTask = useCallback(
    (text: string) => {
      const trimmedText = text.trim();
      if (!trimmedText) return;
      createMutation.mutate(
        { text: trimmedText, date, status: "pending" },
        {
          onSuccess: () => toast.success("Task created"),
          onError: () => toast.error("Failed to save task. Please try again."),
        },
      );
    },
    [date, createMutation],
  );

  const startEditing = useCallback((taskId: string, currentText: string) => {
    setEditingTaskId(taskId);
    setEditingText(currentText);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingTaskId(null);
    setEditingText("");
  }, []);

  const saveTaskEdit = useCallback(
    (taskId: string) => {
      const trimmedText = editingText.trim();
      if (!trimmedText) {
        toast.error("Task text cannot be empty");
        return;
      }
      const task = tasks.find((item) => item.id === taskId);
      if (!task || trimmedText === task.text) {
        cancelEditing();
        return;
      }
      cancelEditing();
      updateMutation.mutate(
        { taskId, updates: { text: trimmedText } },
        {
          onSuccess: () => toast.success("Task updated"),
          onError: () => toast.error("Failed to update task. Please try again."),
        },
      );
    },
    [editingText, tasks, cancelEditing, updateMutation],
  );

  const handleDeleteTask = useCallback(
    (taskId: string) => {
      deleteMutation.mutate(taskId, {
        onSuccess: () => toast.success("Task deleted"),
        onError: () => toast.error("Failed to delete task. Please try again."),
      });
    },
    [deleteMutation],
  );

  const handleTextareaBlur = useCallback(async () => {
    const lines = (draft ?? textareaValue)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    setDraft(null);

    for (const line of lines) {
      const { status, text } = statusFromLine(line);
      if (!text) continue;
      const existing = tasks.find((task) => task.text === text);
      if (existing) {
        if (existing.status !== status) {
          statusMutation.mutate({ taskId: existing.id, status });
        }
      } else {
        createMutation.mutate({ text, date, status });
      }
    }
  }, [draft, textareaValue, tasks, date, statusMutation, createMutation]);

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
        "min-w-[400px] h-full shadow-lg bg-[var(--stone-0)] text-[var(--stone-900)] transition-all duration-[var(--duration-base)] ease-[var(--ease-out)]",
        focused && "border-[1.5px] border-[var(--gray-700)]",
        !focused && "border border-[var(--neutral-300)] scale-95",
        className,
      )}
    >
      <CardContent className="p-5 py-4">
        <div className="flex justify-between items-start mb-4">
          <span className="w-4 h-4 rounded-full bg-[var(--stone-100)] shadow-inner border-2 border-[var(--neutral-200)]" />
          <span className="text-xs text-[var(--stone-700)]">{date}</span>
          <span className="text-xs text-[var(--stone-700)]">{day}</span>
        </div>

        {cardStyle === "line" ? (
          <div>
            {allItems.map((item, index) => {
              const isTask = !("isEmpty" in item);
              const task = isTask ? item : null;
              const open = task != null && openId === task.id;
              const range = task ? formatRange(task) : "";

              return (
                <div key={item.id}>
                  <div className="flex items-center gap-3 py-2.5">
                    <DiamondIcon
                      status={task?.status ?? "pending"}
                      open={open}
                      onClick={() =>
                        task &&
                        setOpenId((current) =>
                          current === task.id ? null : task.id,
                        )
                      }
                    />
                    {task ? (
                      <div className="flex items-center gap-2 flex-1 min-w-0 group">
                        {editingTaskId === task.id ? (
                          <input
                            type="text"
                            value={editingText}
                            onChange={(event) => setEditingText(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") saveTaskEdit(task.id);
                              else if (event.key === "Escape") cancelEditing();
                            }}
                            onBlur={() => saveTaskEdit(task.id)}
                            autoFocus
                            className="text-base font-mono text-[var(--stone-800)] flex-1 bg-transparent border-b-2 border-[var(--gray-700)] outline-none"
                          />
                        ) : (
                          <>
                            <span
                              onDoubleClick={() => startEditing(task.id, task.text)}
                              className={cn(
                                "text-base font-mono text-[var(--stone-700)] flex-1 min-w-0 truncate cursor-text",
                                task.status === "done" &&
                                  "line-through text-[var(--stone-400)]",
                              )}
                            >
                              {task.text}
                            </span>
                            <span
                              className="w-[7.5rem] shrink-0 text-center text-sm font-mono text-[var(--stone-600)] tabular-nums border-b border-[var(--neutral-300)]"
                              aria-label="Time range"
                            >
                              {range === "Anytime" ? "" : range}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(task.id)}
                              className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-[var(--duration-fast)] p-1 hover:bg-[var(--stone-100)] rounded-[var(--radius-control)]"
                              aria-label="Delete task"
                            >
                              <Trash2 size={14} className="text-[var(--stone-400)]" />
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder=""
                        aria-label="Add a task"
                        className="text-base font-sans text-[var(--stone-800)] flex-1 bg-transparent border-none outline-none placeholder:text-[var(--stone-300)]"
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && event.currentTarget.value.trim()) {
                            addTask(event.currentTarget.value);
                            event.currentTarget.value = "";
                          }
                        }}
                        onBlur={(event) => {
                          if (event.currentTarget.value.trim()) {
                            addTask(event.currentTarget.value);
                            event.currentTarget.value = "";
                          }
                        }}
                      />
                    )}
                  </div>
                  {open && task ? (
                    <div className="pl-7 pr-1 pb-3 flex flex-col gap-2">
                      {task.first_step ? (
                        <p className="text-sm font-sans text-[var(--stone-700)]">
                          <span className="text-[var(--stone-500)]">First step </span>
                          {task.first_step}
                        </p>
                      ) : null}
                      {task.done_means ? (
                        <p className="text-sm font-sans text-[var(--stone-700)]">
                          <span className="text-[var(--stone-500)]">Done means </span>
                          {task.done_means}
                        </p>
                      ) : null}
                      <StatusToggle
                        value={task.status}
                        onChange={(status) => setStatus(task.id, status)}
                        label={`Status for ${task.text}`}
                        disabled={statusMutation.isPending}
                      />
                    </div>
                  ) : null}
                  {index < allItems.length - 1 && (
                    <div className="h-px bg-[var(--neutral-300)]" />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <textarea
            value={textareaValue}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={handleTextareaBlur}
            placeholder="One task per line. Start a line with ✓ for done, or ~ for slipped."
            className="w-full text-base font-mono text-[var(--stone-800)] bg-transparent border-none outline-none resize-none placeholder:text-[var(--stone-300)] min-h-[400px]"
          />
        )}
      </CardContent>
    </Card>
  );
});
