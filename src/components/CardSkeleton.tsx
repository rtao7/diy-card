import { Card, CardContent } from "@/components/ui/card";

/**
 * Skeleton loader for a card while tasks are loading
 */
export function CardSkeleton() {
  return (
    <Card className="min-w-[400px] h-full shadow-lg bg-white border border-gray-300 scale-95">
      <CardContent className="p-5 py-4">
        {/* Header skeleton */}
        <div className="flex justify-between items-start mb-4">
          <div className="w-4 h-4 rounded-full bg-gray-200 animate-pulse"></div>
          <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Task list skeleton */}
        <div className="space-y-0">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index}>
              <div className="flex items-center gap-3 py-2.5">
                <div className="w-4 h-4 bg-gray-200 rounded-sm animate-pulse"></div>
                <div className="h-4 flex-1 bg-gray-200 rounded animate-pulse"></div>
              </div>
              {index < 9 && <div className="h-px bg-gray-200" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

