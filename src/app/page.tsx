"use client";

import { useEffect, useRef, useState } from "react";
import { TodoCard } from "@/components/TodoCard";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import {
  FlipHorizontal,
  FlipHorizontal2,
  LucideFlipHorizontal,
  Plus,
  Rotate3D,
  Rotate3DIcon,
  RotateCcw,
  SwitchCameraIcon,
} from "lucide-react";

function formatDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

function getDayName(date: Date): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[date.getDay()];
}

function getTasksForDate(
  date: Date,
  today: Date
): Array<{ id: string; text: string; completed: boolean }> {
  // Normalize dates to compare only the date part (without time)
  const normalizeDate = (d: Date) => {
    const normalized = new Date(d);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  };

  const normalizedToday = normalizeDate(today);
  const normalizedDate = normalizeDate(date);
  const daysDiff = Math.floor(
    (normalizedToday.getTime() - normalizedDate.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  // Only generate tasks for past dates (last 7 days)
  if (daysDiff <= 0 || daysDiff > 7) {
    return [];
  }

  // Different task sets for different days
  const taskSets = [
    // 1 day ago
    [
      { id: "1", text: "Review project proposal", completed: true },
      { id: "2", text: "Team standup meeting", completed: true },
      { id: "3", text: "Update documentation", completed: false },
    ],
    // 2 days ago
    [
      { id: "1", text: "Grocery shopping", completed: true },
      { id: "2", text: "Gym workout", completed: true },
      { id: "3", text: "Read chapter 5", completed: true },
      { id: "4", text: "Plan weekend trip", completed: false },
    ],
    // 3 days ago
    [
      { id: "1", text: "Client presentation", completed: true },
      { id: "2", text: "Send follow-up emails", completed: true },
      { id: "3", text: "Code review", completed: true },
    ],
    // 4 days ago
    [
      { id: "1", text: "Doctor appointment", completed: true },
      { id: "2", text: "Pick up dry cleaning", completed: true },
      { id: "3", text: "Update resume", completed: false },
    ],
    // 5 days ago
    [
      { id: "1", text: "Weekly planning session", completed: true },
      { id: "2", text: "Budget review", completed: true },
      { id: "3", text: "Call insurance company", completed: true },
      { id: "4", text: "Organize workspace", completed: false },
    ],
    // 6 days ago
    [
      { id: "1", text: "Morning run", completed: true },
      { id: "2", text: "Coffee with friend", completed: true },
      { id: "3", text: "Research new tools", completed: false },
    ],
    // 7 days ago
    [
      { id: "1", text: "Weekend cleanup", completed: true },
      { id: "2", text: "Meal prep for week", completed: true },
      { id: "3", text: "Watch tutorial video", completed: true },
    ],
  ];

  // Return tasks for the specific day (daysDiff is 1-indexed for array)
  return taskSets[daysDiff - 1] || [];
}

export default function Home() {
  const today = new Date();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(100); // Start with today's card

  // Generate many cards (100 days before to 100 days after = 201 cards total)
  const totalDays = 201;
  const daysBefore = 100;
  const cards = Array.from({ length: totalDays }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + (i - daysBefore)); // -100 to +100
    return {
      date,
      formattedDate: formatDate(date),
      day: getDayName(date),
      isToday: i === daysBefore,
    };
  });

  // Today's tasks
  const todayTasks = [
    { id: "1", text: "Call mom", completed: true },
    { id: "2", text: "Work on design system", completed: true },
    { id: "3", text: "Coding session", completed: false },
  ];

  // Handle scroll to determine focused card
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const containerWidth = container.clientWidth;
      const scrollLeft = container.scrollLeft;
      const centerPoint = scrollLeft + containerWidth / 2;

      // Find which card is closest to center
      let closestIndex = 0;
      let closestDistance = Infinity;

      cardRefs.current.forEach((cardRef, index) => {
        if (cardRef) {
          const cardLeft = cardRef.offsetLeft;
          const cardWidth = cardRef.offsetWidth;
          const cardCenter = cardLeft + cardWidth / 2;
          const distance = Math.abs(centerPoint - cardCenter);

          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
          }
        }
      });

      setFocusedIndex(closestIndex);
    };

    container.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial check

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Scroll to center card on initial load
  useEffect(() => {
    const container = scrollContainerRef.current;
    const centerCard = cardRefs.current[daysBefore];

    if (centerCard && container) {
      const containerWidth = container.clientWidth;
      const cardLeft = centerCard.offsetLeft;
      const cardWidth = centerCard.offsetWidth;
      const scrollPosition = cardLeft - containerWidth / 2 + cardWidth / 2;

      container.scrollTo({
        left: scrollPosition,
        behavior: "auto",
      });
    }
  }, []);

  return (
    <div className="flex flex-col h-screen font-mono bg-gradient-to-b from-[#f5f3f0] to-[#d4d8d6] overflow-hidden">
      <Header />

      {/* Main Content */}
      <div className="flex-1 flex items-center">
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-8 w-full h-full overflow-x-auto overflow-y-hidden scrollbar-hide snap-x snap-mandatory"
          style={{
            scrollSnapType: "x mandatory",
            paddingLeft: "calc(50% - 200px)", // Center the first card
            paddingRight: "calc(50% - 200px)", // Center the last card
          }}
        >
          {cards.map((card, index) => {
            const isFocused = index === focusedIndex;
            const isToday = index === daysBefore;

            // Get tasks for this date (today's tasks or past date tasks)
            const cardTasks = isToday
              ? todayTasks
              : getTasksForDate(card.date, today);

            return (
              <div
                key={card.formattedDate}
                ref={(el) => {
                  cardRefs.current[index] = el;
                }}
                className="shrink-0 snap-center"
              >
                <TodoCard
                  date={card.formattedDate}
                  day={card.day}
                  tasks={isFocused ? cardTasks : []}
                  faded={!isFocused}
                  focused={isFocused}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="pb-6 flex justify-center space-x-4">
        <Button variant="outline" className="text-lg gap-2">
          <LucideFlipHorizontal size={20} />
          Flip
        </Button>
        <Button variant="outline" className="text-lg gap-2">
          <SwitchCameraIcon size={20} />
          Change Card
        </Button>
      </div>
    </div>
  );
}
