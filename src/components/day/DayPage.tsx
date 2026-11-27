"use client";

import { useEffect, useState } from "react";
import { Button, Text } from "ray-ui";
import { useTasksQuery } from "@/hooks/useTasksQuery";
import { formatSheetDate, shiftDay } from "@/lib/taskModel";
import { Timeline } from "./Timeline";
import styles from "./DayPage.module.css";

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sameDay(a: Date, b: Date): boolean {
  return formatSheetDate(a) === formatSheetDate(b);
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
      // The player seeks with these keys and marks the event handled.
      if (event.defaultPrevented) return;
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
          <Timeline tasks={tasks} now={now} live={isToday} />
        )}
      </div>
    </main>
  );
}
