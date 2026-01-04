"use client";

import { TodoCard } from "@/components/TodoCard";
import { CardSkeleton } from "@/components/CardSkeleton";
import { useTasksQuery } from "@/hooks/useTasksQuery";
import { CardStyle } from "@/app/page";

interface CardWrapperProps {
  date: string;
  day: string;
  isFocused: boolean;
  cardStyle: CardStyle;
}

/**
 * Wrapper component for TodoCard that handles data fetching
 * This allows us to use hooks inside the map
 */
export function CardWrapper({
  date,
  day,
  isFocused,
  cardStyle,
}: CardWrapperProps) {
  const { data: cardTasks = [], isLoading } = useTasksQuery(date);

  if (isLoading) {
    return <CardSkeleton />;
  }

  // Show all tasks, including completed ones (they'll be displayed with strikethrough)
  return (
    <TodoCard
      date={date}
      day={day}
      tasks={cardTasks}
      faded={!isFocused}
      focused={isFocused}
      cardStyle={cardStyle}
    />
  );
}

