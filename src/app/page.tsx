"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CardSkeleton } from "@/components/CardSkeleton";
import { CardWrapper } from "@/components/CardWrapper";
import { Header } from "@/components/Header";
import { useIsClient } from "@/hooks/useIsClient";
import { formatSheetDate } from "@/lib/dates";

export default function Home() {
  const isClient = useIsClient();
  const [dayOffset, setDayOffset] = useState(0);

  const selected = useMemo(() => {
    if (!isClient) return null;
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + dayOffset);
    return date;
  }, [isClient, dayOffset]);

  const weekday = selected?.toLocaleDateString("en-US", { weekday: "long" }) ?? "";
  const heading = selected
    ? selected.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <div className="min-h-dvh bg-[#e8e8e4] font-sans text-[#2a2a28]">
      <Header />
      <main className="mx-auto w-full max-w-[28rem] px-4 pb-16">
        <div className="mb-4 flex items-center justify-between gap-2">
          <DayButton
            direction="previous"
            onClick={() => setDayOffset((value) => value - 1)}
          />
          <div className="min-w-0 text-center">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#7a7a74]">
              {weekday || "\u00a0"}
            </p>
            <h1 className="mt-1 text-[22px] font-medium leading-tight tracking-[-0.03em]">
              {heading || "Daily"}
            </h1>
            {selected && dayOffset !== 0 && (
              <button
                type="button"
                onClick={() => setDayOffset(0)}
                className="mt-1 min-h-11 px-3 text-[12px] text-[#5e5e5a] underline-offset-4 hover:underline"
              >
                Back to today
              </button>
            )}
          </div>
          <DayButton
            direction="next"
            onClick={() => setDayOffset((value) => value + 1)}
          />
        </div>
        {selected ? (
          <CardWrapper date={formatSheetDate(selected)} />
        ) : (
          <CardSkeleton />
        )}
      </main>
    </div>
  );
}

function DayButton({
  direction,
  onClick,
}: {
  direction: "previous" | "next";
  onClick: () => void;
}) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={direction === "previous" ? "Previous day" : "Next day"}
      onClick={onClick}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#2a2a28] transition-transform duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#deded8] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2a2a28] motion-reduce:transition-none motion-reduce:active:scale-100"
    >
      <Icon size={18} strokeWidth={1.75} aria-hidden />
    </button>
  );
}
