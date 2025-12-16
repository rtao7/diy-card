"use client";

import { useEffect, useRef, useState } from "react";
import { TodoCard } from "@/components/TodoCard";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { getTasksForDate } from "@/lib/tasks";
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

// Removed hardcoded tasks - now fetching from Google Sheets via API

export default function Home() {
  const today = new Date();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(100); // Start with today's card

  // Store tasks for each date (so we don't fetch multiple times)
  const [tasksCache, setTasksCache] = useState<
    Record<string, Array<{ id: string; text: string; completed: boolean }>>
  >({});
  const [loadingDates, setLoadingDates] = useState<Set<string>>(new Set());

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

  // Helper function to fetch tasks for a specific date
  const fetchTasksForDate = async (dateString: string) => {
    // Don't fetch if we already have the tasks or are currently loading
    if (tasksCache[dateString]) {
      return; // Already have it
    }

    if (loadingDates.has(dateString)) {
      return; // Already loading
    }

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
    } catch (error) {
      console.error(`❌ Error fetching tasks for ${dateString}:`, error);
      // Store empty array on error so we don't keep trying
      setTasksCache((prev) => ({
        ...prev,
        [dateString]: [],
      }));
    } finally {
      // Remove from loading set
      setLoadingDates((prev) => {
        const next = new Set(prev);
        next.delete(dateString);
        return next;
      });
    }
  };

  // Fetch tasks for focused card + nearby cards (±5 days)
  useEffect(() => {
    const loadTasksForFocusedAndNearby = async () => {
      const daysToPreload = 5; // Load tasks for 5 days before and after focused card
      const datesToLoad: string[] = [];

      // Calculate dates to load (focused + nearby)
      for (let offset = -daysToPreload; offset <= daysToPreload; offset++) {
        const targetDate = new Date(today);
        targetDate.setDate(
          today.getDate() + (focusedIndex - daysBefore + offset)
        );
        const dateString = formatDate(targetDate);
        datesToLoad.push(dateString);
      }

      console.log(
        "🔍 Loading tasks for focused card and nearby dates:",
        datesToLoad
      );

      // Fetch all dates in parallel (but respect rate limits)
      const fetchPromises = datesToLoad.map((dateString) =>
        fetchTasksForDate(dateString)
      );
      await Promise.all(fetchPromises);
    };

    loadTasksForFocusedAndNearby();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedIndex]); // Re-fetch when focused card changes

  // Initial load: Fetch tasks for a date range (last 30 days + next 30 days)
  useEffect(() => {
    const loadInitialTasks = async () => {
      const daysToLoad = 30; // Load 30 days before and after today
      const datesToLoad: string[] = [];

      for (let offset = -daysToLoad; offset <= daysToLoad; offset++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + offset);
        const dateString = formatDate(targetDate);
        datesToLoad.push(dateString);
      }

      console.log(
        "🚀 Initial load: Fetching tasks for date range:",
        datesToLoad.length,
        "dates"
      );

      // Fetch in batches to avoid overwhelming the API
      const batchSize = 10;
      for (let i = 0; i < datesToLoad.length; i += batchSize) {
        const batch = datesToLoad.slice(i, i + batchSize);
        await Promise.all(
          batch.map((dateString) => fetchTasksForDate(dateString))
        );
        // Small delay between batches to be nice to the API
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      console.log(
        "✅ Initial load complete. Cache has",
        Object.keys(tasksCache).length,
        "dates"
      );
    };

    // Only run once on mount
    loadInitialTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps = run once on mount

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

            // Get tasks from cache (fetched from Google Sheets)
            // Show tasks on all cards (not just focused) so they're always visible
            const cardTasks = tasksCache[card.formattedDate] || [];

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
                  tasks={cardTasks} // Show tasks on all cards
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
