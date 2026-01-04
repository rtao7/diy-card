import { useState, useEffect, useRef, useCallback } from "react";

interface UseCardFocusOptions {
  totalCards: number;
  initialFocusedIndex?: number;
  debounceMs?: number;
}

/**
 * Custom hook for managing card focus based on scroll position
 * Handles scroll detection and debouncing
 */
export function useCardFocus({
  totalCards,
  initialFocusedIndex = 0,
  debounceMs = 100,
}: UseCardFocusOptions) {
  const [focusedIndex, setFocusedIndex] = useState(initialFocusedIndex);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Calculates which card is closest to the center
   */
  const calculateFocusedCard = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

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
  }, []);

  /**
   * Debounced scroll handler
   */
  const handleScroll = useCallback(() => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      calculateFocusedCard();
    }, debounceMs);
  }, [calculateFocusedCard, debounceMs]);

  /**
   * Sets up scroll listener
   */
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll, { passive: true });
    calculateFocusedCard(); // Initial check

    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [handleScroll, calculateFocusedCard]);

  /**
   * Scrolls to center a specific card
   */
  const scrollToCard = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const container = scrollContainerRef.current;
      const targetCard = cardRefs.current[index];

      if (container && targetCard) {
        const containerWidth = container.clientWidth;
        const cardLeft = targetCard.offsetLeft;
        const cardWidth = targetCard.offsetWidth;
        const scrollPosition = cardLeft - containerWidth / 2 + cardWidth / 2;

        container.scrollTo({
          left: scrollPosition,
          behavior,
        });
      }
    },
    []
  );

  /**
   * Sets a card ref
   */
  const setCardRef = useCallback((index: number, element: HTMLDivElement | null) => {
    cardRefs.current[index] = element;
  }, []);

  return {
    focusedIndex,
    scrollContainerRef,
    setCardRef,
    scrollToCard,
  };
}

