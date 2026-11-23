"use client";

import { CardSkeleton } from "@/components/CardSkeleton";
import { DayTimeline } from "@/components/DayTimeline";
import { useTasksQuery } from "@/hooks/useTasksQuery";

interface CardWrapperProps {
  date: string;
}

export function CardWrapper({ date }: CardWrapperProps) {
  const { data, isPending, isError, error, refetch } = useTasksQuery(date);

  if (isPending) return <CardSkeleton />;

  if (isError) {
    const message = error instanceof Error ? error.message : "Could not load this day.";
    return (
      <div className="rounded-3xl bg-[#f4f4f1] px-5 py-10 text-center">
        <p className="text-[15px] text-[#2a2a28]">Could not load this day.</p>
        <p className="mx-auto mt-2 max-w-[18rem] text-[13px] leading-5 text-[#6e6e69]">
          {message}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-5 min-h-11 rounded-full bg-[#2a2a28] px-4 text-[13px] text-[#f4f4f1] transition-transform duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          Try again
        </button>
      </div>
    );
  }

  return <DayTimeline date={date} tasks={data ?? []} />;
}
