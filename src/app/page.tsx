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
  Check,
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

export type CardStyle = "line" | "textarea";

export default function Home() {
  const today = new Date();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(5); // Start with today's card (index 5 in 10-card array)
  const [cardStyles, setCardStyles] = useState<Record<string, CardStyle>>({});
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const styleMenuRef = useRef<HTMLDivElement>(null);

  // Store tasks for each date (so we don't fetch multiple times)
  const [tasksCache, setTasksCache] = useState<
    Record<string, Array<{ id: string; text: string; completed: boolean }>>
  >({});
  const [loadingDates, setLoadingDates] = useState<Set<string>>(new Set());

  // Use refs to track current state to avoid stale closures
  const tasksCacheRef = useRef(tasksCache);
  const loadingDatesRef = useRef(loadingDates);

  // Keep refs in sync with state
  useEffect(() => {
    tasksCacheRef.current = tasksCache;
  }, [tasksCache]);

  useEffect(() => {
    loadingDatesRef.current = loadingDates;
  }, [loadingDates]);

  // Generate 10 cards (5 days before to 4 days after today = 10 cards total)
  const totalDays = 10;
  const daysBefore = 5; // 5 days before today
  const cards = Array.from({ length: totalDays }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + (i - daysBefore)); // -5 to +4
    return {
      date,
      formattedDate: formatDate(date),
      day: getDayName(date),
      isToday: i === daysBefore,
    };
  });

  // Rate limiting: track request times to avoid hitting quota
  const requestTimesRef = useRef<number[]>([]);
  const RATE_LIMIT_DELAY = 200; // Minimum 200ms between requests (5 requests/second max)
  const MAX_REQUESTS_PER_WINDOW = 50; // Max 50 requests per 100 seconds
  const WINDOW_DURATION = 100000; // 100 seconds in milliseconds

  // Helper function to wait if we're hitting rate limits
  const waitForRateLimit = async () => {
    const now = Date.now();
    const recentRequests = requestTimesRef.current.filter(
      (time) => now - time < WINDOW_DURATION
    );
    requestTimesRef.current = recentRequests;

    // If we're approaching the limit, wait
    if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
      const oldestRequest = Math.min(...recentRequests);
      const waitTime = WINDOW_DURATION - (now - oldestRequest) + 1000; // Add 1 second buffer
      console.log(
        `⏳ Rate limit: waiting ${Math.ceil(
          waitTime / 1000
        )}s before next request`
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    // Always wait minimum delay between requests
    const lastRequest =
      requestTimesRef.current[requestTimesRef.current.length - 1];
    if (lastRequest) {
      const timeSinceLastRequest = now - lastRequest;
      if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
        await new Promise((resolve) =>
          setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest)
        );
      }
    }

    // Record this request
    requestTimesRef.current.push(Date.now());
  };

  // Helper function to fetch tasks for a specific date
  // Uses refs to avoid stale closure issues
  const fetchTasksForDate = async (dateString: string) => {
    // Don't fetch if we already have the tasks or are currently loading
    // Use refs to get current values instead of closure values
    if (tasksCacheRef.current[dateString]) {
      return; // Already have it
    }

    if (loadingDatesRef.current.has(dateString)) {
      return; // Already loading
    }

    // Wait for rate limit before making request
    await waitForRateLimit();

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
    } catch (error: any) {
      console.error(`❌ Error fetching tasks for ${dateString}:`, error);

      // If it's a quota error, don't store empty array - we'll retry later
      const isQuotaError =
        error?.message?.includes("Quota exceeded") ||
        error?.apiError?.details?.includes("Quota exceeded");

      if (isQuotaError) {
        console.warn(
          "⚠️ Quota exceeded - will retry later. Please wait a moment."
        );
        // Don't cache empty array for quota errors - allow retry
      } else {
        // Store empty array on other errors so we don't keep trying
        setTasksCache((prev) => ({
          ...prev,
          [dateString]: [],
        }));
      }
    } finally {
      // Remove from loading set
      setLoadingDates((prev) => {
        const next = new Set(prev);
        next.delete(dateString);
        return next;
      });
    }
  };

  // Fetch tasks for focused card only (no preloading to avoid quota)
  // Since we only have 10 cards and they're all loaded initially, we don't need aggressive preloading
  useEffect(() => {
    const loadTasksForFocused = async () => {
      // Only load the focused card's tasks if we don't have it
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + (focusedIndex - daysBefore));
      const dateString = formatDate(targetDate);

      // Only fetch if we don't already have it
      if (!tasksCacheRef.current[dateString]) {
        console.log("🔍 Loading tasks for focused card:", dateString);
        await fetchTasksForDate(dateString);
      }
    };

    loadTasksForFocused();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedIndex]); // Re-fetch when focused card changes

  // Initial load: Fetch tasks only for the 10 visible cards (sequentially to avoid quota)
  useEffect(() => {
    const loadInitialTasks = async () => {
      const datesToLoad: string[] = [];

      // Only load tasks for the 10 cards we're showing
      for (
        let offset = -daysBefore;
        offset < totalDays - daysBefore;
        offset++
      ) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + offset);
        const dateString = formatDate(targetDate);
        datesToLoad.push(dateString);
      }

      console.log(
        "🚀 Initial load: Fetching tasks for",
        datesToLoad.length,
        "dates (visible cards only, sequential to avoid quota)"
      );

      // Fetch sequentially with delays to avoid hitting quota
      for (const dateString of datesToLoad) {
        await fetchTasksForDate(dateString);
        // Small delay between requests
        await new Promise((resolve) => setTimeout(resolve, 250));
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

  // Close style menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        styleMenuRef.current &&
        !styleMenuRef.current.contains(event.target as Node)
      ) {
        setShowStyleMenu(false);
      }
    };

    if (showStyleMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showStyleMenu]);

  // Get the focused card's style for the menu
  const focusedCard = cards[focusedIndex];
  const focusedCardDate = focusedCard?.formattedDate;
  const currentFocusedStyle = focusedCardDate
    ? cardStyles[focusedCardDate] || "line"
    : "line";

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
                  cardStyle={cardStyles[card.formattedDate] || "line"}
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
        <div className="relative" ref={styleMenuRef}>
          <Button
            variant="outline"
            className="text-lg gap-2"
            onClick={() => setShowStyleMenu(!showStyleMenu)}
          >
            <SwitchCameraIcon size={20} />
            Change Card
          </Button>
          {showStyleMenu && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-56 bg-white border border-gray-300 rounded-md shadow-lg z-50">
              <div className="py-1">
                <button
                  onClick={() => {
                    if (focusedCardDate) {
                      setCardStyles((prev) => ({
                        ...prev,
                        [focusedCardDate]: "line",
                      }));
                    }
                    setShowStyleMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center justify-between"
                >
                  <span className="text-base">Line Style</span>
                  {currentFocusedStyle === "line" && (
                    <Check size={18} className="text-[#4728F5]" />
                  )}
                </button>
                <button
                  onClick={() => {
                    if (focusedCardDate) {
                      setCardStyles((prev) => ({
                        ...prev,
                        [focusedCardDate]: "textarea",
                      }));
                    }
                    setShowStyleMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center justify-between"
                >
                  <span className="text-base">Text Area</span>
                  {currentFocusedStyle === "textarea" && (
                    <Check size={18} className="text-[#4728F5]" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
