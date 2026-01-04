"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { CardWrapper } from "@/components/CardWrapper";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useCardFocus } from "@/hooks/useCardFocus";
import { LucideFlipHorizontal, SwitchCameraIcon, Check } from "lucide-react";

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

export type CardStyle = "line" | "textarea";

export default function Home() {
  const today = new Date();
  const [cardStyles, setCardStyles] = useState<Record<string, CardStyle>>({});
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const styleMenuRef = useRef<HTMLDivElement>(null);

  // Generate 10 cards (5 days before to 4 days after today = 10 cards total)
  const totalDays = 10;
  const daysBefore = 5; // 5 days before today
  const cards = useMemo(
    () =>
      Array.from({ length: totalDays }, (_, i) => {
        const date = new Date(today);
        date.setDate(today.getDate() + (i - daysBefore)); // -5 to +4
        return {
          date,
          formattedDate: formatDate(date),
          day: getDayName(date),
          isToday: i === daysBefore,
        };
      }),
    [today, daysBefore, totalDays]
  );

  // Use custom hook for card focus management
  const { focusedIndex, scrollContainerRef, setCardRef, scrollToCard } =
    useCardFocus({
      totalCards: totalDays,
      initialFocusedIndex: daysBefore,
      debounceMs: 100,
    });

  // Scroll to center card on initial load
  useEffect(() => {
    scrollToCard(daysBefore, "auto");
  }, [scrollToCard, daysBefore]);

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

            return (
              <div
                key={card.formattedDate}
                ref={(el) => setCardRef(index, el)}
                className="shrink-0 snap-center"
              >
                <CardWrapper
                  date={card.formattedDate}
                  day={card.day}
                  isFocused={isFocused}
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
