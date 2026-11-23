"use client";

import { useEffect, useState } from "react";
import { Button, Text } from "ray-ui";
import { useTasksQuery, useUpdateStatusMutation } from "@/hooks/useTasksQuery";
import {
  formatSheetDate,
  shiftDay,
  Task,
  TaskStatus,
} from "@/lib/taskModel";
import { Timeline } from "./Timeline";
import styles from "./DayPage.module.css";

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sameDay(a: Date, b: Date): boolean {
  return formatSheetDate(a) === formatSheetDate(b);
}

function summary(tasks: Task[]): string {
  const counts = { pending: 0, done: 0, slipped: 0 };
  for (const task of tasks) counts[task.status] += 1;
  const parts: string[] = [];
  if (counts.pending) {
    parts.push(`${counts.pending} pending`);
  }
  if (counts.done) {
    parts.push(`${counts.done} done`);
  }
  if (counts.slipped) {
    parts.push(`${counts.slipped} slipped`);
  }
  return parts.join(" · ");
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d={direction === "left" ? "M10 4.5 6 8l4 3.5" : "M6 4.5 10 8l-4 3.5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DayTimeline({
  date,
  tasks,
  now,
  live,
}: {
  date: string;
  tasks: Task[];
  now: Date;
  live: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const statusMutation = useUpdateStatusMutation(date);

  function changeStatus(taskId: string, status: TaskStatus) {
    setErrorId(null);
    statusMutation.mutate(
      { taskId, status },
      {
        onError: () => setErrorId(taskId),
      },
    );
  }

  return (
    <Timeline
      tasks={tasks}
      now={now}
      live={live}
      openId={openId}
      savingId={
        statusMutation.isPending
          ? (statusMutation.variables?.taskId ?? null)
          : null
      }
      errorId={errorId}
      onToggle={(id) => setOpenId((current) => (current === id ? null : id))}
      onStatus={changeStatus}
    />
  );
}

export function DayPage() {
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [now, setNow] = useState(() => new Date());
  const date = formatSheetDate(day);
  const today = startOfDay(now);
  const isToday = sameDay(day, today);
  const tasksQuery = useTasksQuery(date);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === "ArrowLeft") setDay((current) => shiftDay(current, -1));
      if (event.key === "ArrowRight") setDay((current) => shiftDay(current, 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const tasks = tasksQuery.data ?? [];
  const weekday = day.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = day.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
  const line = summary(tasks);

  return (
    <main className={styles.page}>
      <div className={styles.column}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <Text as="p" variant="caption" className={styles.kicker}>
              diy card
            </Text>
            <Text as="p" variant="caption" tone="muted">
              {isToday ? "Today" : weekday}
            </Text>
          </div>
          <Text variant="heading-lg">{weekday}</Text>
          <Text variant="body" tone="muted" className={styles.date}>
            {monthDay}
          </Text>
          {line ? (
            <Text as="p" variant="caption" tone="muted" className={styles.summary}>
              {line}
            </Text>
          ) : null}
        </header>

        <div className={styles.nav}>
          <Button
            variant="ghost"
            icon={<Chevron direction="left" />}
            aria-label="Previous day"
            className={styles.press}
            onClick={() => setDay((current) => shiftDay(current, -1))}
          />
          <Button
            variant="outline"
            className={styles.today}
            disabled={isToday}
            onClick={() => setDay(startOfDay(new Date()))}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            icon={<Chevron direction="right" />}
            aria-label="Next day"
            className={styles.press}
            onClick={() => setDay((current) => shiftDay(current, 1))}
          />
        </div>

        {tasksQuery.isLoading ? (
          <div className={styles.loading} aria-busy="true">
            <span className={styles.srOnly}>Loading this day</span>
            <span className={styles.bone} />
            <span className={styles.bone} />
            <span className={styles.boneShort} />
          </div>
        ) : tasksQuery.isError ? (
          <div className={styles.empty}>
            <Text variant="heading-sm">Couldn&apos;t load this day</Text>
            <Text variant="body" tone="muted">
              {tasksQuery.error instanceof Error
                ? tasksQuery.error.message
                : "Try again in a moment."}
            </Text>
            <Button variant="outline" onClick={() => tasksQuery.refetch()}>
              Retry
            </Button>
          </div>
        ) : tasks.length === 0 ? (
          <div className={styles.empty}>
            <Text variant="heading-sm">Nothing planned</Text>
            <Text variant="body" tone="muted">
              Blocks show up here once they&apos;re written for this date.
            </Text>
          </div>
        ) : (
          <DayTimeline
            key={date}
            date={date}
            tasks={tasks}
            now={now}
            live={isToday}
          />
        )}
      </div>
    </main>
  );
}
