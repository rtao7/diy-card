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
  const [today] = useState(() => new Date());
  const [cardStyles, setCardStyles] = useState<Record<string, CardStyle>>({});
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const styleMenuRef = useRef<HTMLDivElement>(null);

  // 5 days before today through 4 days after, same carousel as the original card.
  const totalDays = 10;
  const daysBefore = 5;
  const cards = useMemo(
    () =>
      Array.from({ length: totalDays }, (_, i) => {
        const date = new Date(today);
        date.setDate(today.getDate() + (i - daysBefore));
        return {
          date,
          formattedDate: formatDate(date),
          day: getDayName(date),
          isToday: i === daysBefore,
        };
      }),
    [today, daysBefore, totalDays],
  );

  const { focusedIndex, scrollContainerRef, setCardRef, scrollToCard } =
    useCardFocus({
      totalCards: totalDays,
      initialFocusedIndex: daysBefore,
      debounceMs: 100,
    });

  useEffect(() => {
    scrollToCard(daysBefore, "auto");
  }, [scrollToCard, daysBefore]);

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

  const focusedCard = cards[focusedIndex];
  const focusedCardDate = focusedCard?.formattedDate;
  const currentFocusedStyle = focusedCardDate
    ? cardStyles[focusedCardDate] || "line"
    : "line";

  return (
    <div className="flex flex-col h-screen font-mono overflow-hidden bg-gradient-to-b from-[var(--stone-50)] to-[var(--stone-300)] text-[var(--stone-900)]">
      <Header />

      <div className="flex-1 flex items-center min-h-0">
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-8 w-full h-full overflow-x-auto overflow-y-hidden scrollbar-hide snap-x snap-mandatory"
          style={{
            scrollSnapType: "x mandatory",
            paddingLeft: "calc(50% - 200px)",
            paddingRight: "calc(50% - 200px)",
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
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-56 bg-[var(--stone-0)] border border-[var(--neutral-300)] rounded-md shadow-lg z-50">
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
                  className="w-full text-left px-4 py-2 hover:bg-[var(--stone-100)] flex items-center justify-between"
                >
                  <span className="text-base">Line Style</span>
                  {currentFocusedStyle === "line" && (
                    <Check size={18} className="text-[var(--gray-700)]" />
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
                  className="w-full text-left px-4 py-2 hover:bg-[var(--stone-100)] flex items-center justify-between"
                >
                  <span className="text-base">Text Area</span>
                  {currentFocusedStyle === "textarea" && (
                    <Check size={18} className="text-[var(--gray-700)]" />
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
