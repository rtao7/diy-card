export function CardSkeleton() {
  return (
    <div className="rounded-3xl bg-[#f4f4f1] px-4 py-5">
      <div className="mb-5 h-3 w-28 rounded-full bg-[#e4e4e0] motion-safe:animate-pulse" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-2xl px-3 py-3">
            <div className="h-3 w-24 rounded-full bg-[#e4e4e0] motion-safe:animate-pulse" />
            <div className="mt-3 h-4 w-3/4 rounded-full bg-[#e7e7e3] motion-safe:animate-pulse" />
            <div className="mt-2 h-3 w-1/2 rounded-full bg-[#ecece8] motion-safe:animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
