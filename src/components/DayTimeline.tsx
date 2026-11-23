"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useNow } from "@/hooks/useNow";
import { useIsClient } from "@/hooks/useIsClient";
import { useUpdateTaskMutation } from "@/hooks/useTasksQuery";
import { formatSheetDate } from "@/lib/dates";
import {
  compareTasks,
  formatBlockTime,
  formatDuration,
  formatMinutes,
  parseTimeToMinutes,
} from "@/lib/taskModel";
import type { Task, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DayTimelineProps {
  date: string;
  tasks: Task[];
}

type TimelineItem =
  | {
      kind: "task";
      task: Task;
      current: boolean;
      progress: number | null;
    }
  | { kind: "now"; label: string }
  | { kind: "label"; text: string };

function buildItems(tasks: Task[], now: Date | null, isToday: boolean): TimelineItem[] {
  const sorted = [...tasks].sort(compareTasks);
  const hasTimes = sorted.some((task) => task.start);
  if (!isToday || !now || !hasTimes) {
    return sorted.map((task) => ({
      kind: "task",
      task,
      current: false,
      progress: null,
    }));
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const items: TimelineItem[] = [];
  let nowPlaced = false;
  let labeledUntimed = false;

  sorted.forEach((task, index) => {
    const start = task.start ? parseTimeToMinutes(task.start) : null;
    if (!labeledUntimed && start == null && hasTimes) {
      if (!nowPlaced) {
        items.push({ kind: "now", label: formatMinutes(nowMinutes) });
        nowPlaced = true;
      }
      items.push({ kind: "label", text: "Anytime" });
      labeledUntimed = true;
    }

    let end = task.end ? parseTimeToMinutes(task.end) : null;
    if (start != null && end == null) {
      const nextStart = sorted
        .slice(index + 1)
        .map((item) => (item.start ? parseTimeToMinutes(item.start) : null))
        .find((value) => value != null && start != null && value > start);
      end =
        nextStart != null
          ? nextStart
          : Math.min(start + 60, 24 * 60 - 1);
    }

    const current =
      start != null && end != null && nowMinutes >= start && nowMinutes < end;
    const progress =
      current && start != null && end != null && end > start
        ? (nowMinutes - start) / (end - start)
        : null;

    if (!nowPlaced && start != null && nowMinutes < start) {
      items.push({ kind: "now", label: formatMinutes(nowMinutes) });
      nowPlaced = true;
    }

    items.push({ kind: "task", task, current, progress });
    if (current) nowPlaced = true;
  });

  if (!nowPlaced) {
    items.push({ kind: "now", label: formatMinutes(nowMinutes) });
  }
  return items;
}

const press =
  "transition-transform duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.985] motion-reduce:transition-none motion-reduce:active:scale-100";

export function DayTimeline({ date, tasks }: DayTimelineProps) {
  const now = useNow();
  const isClient = useIsClient();
  const today = isClient ? formatSheetDate(new Date()) : null;
  const isToday = today === date;
  const [openId, setOpenId] = useState<string | null>(null);
  const update = useUpdateTaskMutation();
  const items = buildItems(tasks, now, isToday);

  const done = tasks.filter((task) => task.status === "done").length;
  const slipped = tasks.filter((task) => task.status === "slipped").length;
  const pending = tasks.filter((task) => task.status === "pending").length;
  const clock = isToday && now ? formatMinutes(now.getHours() * 60 + now.getMinutes()) : null;

  function setStatus(task: Task, status: TaskStatus) {
    if (task.status === status) return;
    update.mutate(
      { taskId: task.id, date, updates: { status } },
      {
        onError: () => toast("Could not update this block. Try again."),
      },
    );
  }

  return (
    <section className="rounded-3xl bg-[#f4f4f1] px-3 py-4 shadow-[0_1px_1px_rgba(40,40,30,0.04),0_12px_32px_rgba(40,40,30,0.04)]">
      <div className="mb-3 flex items-baseline justify-between gap-3 px-2">
        <p aria-live="polite" className="text-[12px] text-[#6e6e69]">
          {tasks.length === 0
            ? "Nothing scheduled"
            : `${done} done · ${slipped} slipped · ${pending} open`}
        </p>
        {clock && (
          <p className="font-mono text-[12px] tabular-nums tracking-tight text-[#2a2a28]">
            {clock}
          </p>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d9d9d4] px-4 py-12 text-center">
          <p className="text-[14px] text-[#3f3f3c]">Nothing on this day</p>
          <p className="mt-1 text-[12px] leading-5 text-[#8a8a84]">
            Blocks added for this date show up here, in start-time order.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {items.map((item) => {
            if (item.kind === "label") {
              return (
                <p
                  key={item.text}
                  className="px-2 pb-1 pt-3 text-[11px] uppercase tracking-[0.14em] text-[#8a8a84]"
                >
                  {item.text}
                </p>
              );
            }
            if (item.kind === "now") {
              return (
                <div key="now" className="now-row flex items-center gap-3 px-2 py-1.5">
                  <span className="w-[4.5rem] shrink-0 font-mono text-[11px] tabular-nums text-[#2a2a28]">
                    {item.label}
                  </span>
                  <span className="now-dot h-1.5 w-1.5 shrink-0 rounded-full bg-[#2a2a28]" />
                  <span className="h-px flex-1 bg-[#cfcfc9]" />
                  <span className="text-[10px] uppercase tracking-[0.16em] text-[#5e5e5a]">
                    Now
                  </span>
                </div>
              );
            }

            const { task, current, progress } = item;
            const open = openId === task.id;
            const duration = formatDuration(task.start, task.end);

            return (
              <article
                key={task.id}
                data-testid="time-block"
                data-status={task.status}
                data-current={current ? "true" : "false"}
                className={cn(
                  "rounded-2xl transition-[background-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                  current ? "bg-[#ecece8]" : "bg-transparent",
                )}
              >
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() =>
                    setOpenId((currentId) => (currentId === task.id ? null : task.id))
                  }
                  className={cn(
                    "w-full rounded-2xl px-2 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2a2a28]",
                    press,
                  )}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-mono text-[12px] tabular-nums tracking-tight text-[#5c5c58]">
                      {formatBlockTime(task.start, task.end)}
                      {duration && (
                        <span className="ml-2 font-sans text-[11px] text-[#8a8a84]">
                          {duration}
                        </span>
                      )}
                      {current && (
                        <span className="ml-2 font-sans text-[10px] uppercase tracking-[0.14em] text-[#2a2a28]">
                          Now
                        </span>
                      )}
                    </p>
                    <StatusMark status={task.status} />
                  </div>
                  <h2
                    className={cn(
                      "mt-1 text-[15px] leading-5 tracking-[-0.015em] text-[#2a2a28]",
                      task.status === "done" &&
                        "text-[#6d6d68] line-through decoration-[#c8c8c2]",
                    )}
                  >
                    {current && <span className="sr-only">Current block. </span>}
                    {task.text}
                  </h2>
                  {task.first_step && (
                    <p className="mt-1.5 line-clamp-2 text-[12px] leading-4 text-[#6e6e69]">
                      <span className="text-[#4f4f4b]">First</span>
                      <span className="text-[#b0b0aa]"> · </span>
                      {task.first_step}
                    </p>
                  )}
                  {task.done_means && (
                    <p className="mt-0.5 line-clamp-2 text-[12px] leading-4 text-[#6e6e69]">
                      <span className="text-[#4f4f4b]">Done when</span>
                      <span className="text-[#b0b0aa]"> · </span>
                      {task.done_means}
                    </p>
                  )}
                  {progress != null && (
                    <span className="mt-3 block h-0.5 overflow-hidden rounded-full bg-[#dddcd6]">
                      <span
                        className="block h-full bg-[#2a2a28]"
                        style={{ width: `${Math.max(4, Math.round(progress * 100))}%` }}
                      />
                    </span>
                  )}
                </button>

                <div
                  className="grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                  style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <div className="px-2 pb-3">
                      <p className="pb-2 text-[12px] text-[#6e6e69]">
                        How did this block go?
                      </p>
                      <div
                        role="group"
                        aria-label={`Status for ${task.text}`}
                        className="flex gap-2"
                      >
                        <StatusButton
                          label="Pending"
                          pressed={task.status === "pending"}
                          onClick={() => setStatus(task, "pending")}
                        />
                        <StatusButton
                          label="Done"
                          pressed={task.status === "done"}
                          onClick={() => setStatus(task, "done")}
                        />
                        <StatusButton
                          label="Slipped"
                          pressed={task.status === "slipped"}
                          onClick={() => setStatus(task, "slipped")}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function StatusMark({ status }: { status: TaskStatus }) {
  if (status === "pending") return <span className="w-10 shrink-0" />;
  return (
    <span
      key={status}
      className="status-pop shrink-0 text-[11px] tracking-wide text-[#4f4f4b]"
    >
      {status === "done" ? "Done" : "Slipped"}
    </span>
  );
}

function StatusButton({
  label,
  pressed,
  onClick,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "min-h-11 flex-1 rounded-full text-[13px] transition-[background-color,color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2a2a28] motion-reduce:transition-none motion-reduce:active:scale-100",
        pressed
          ? "bg-[#2a2a28] text-[#f6f6f3]"
          : "bg-[#e6e6e2] text-[#2a2a28] hover:bg-[#dcdcd7]",
      )}
    >
      {label}
    </button>
  );
}
