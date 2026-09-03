import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-4">
      <Skeleton className="h-8 w-32" />
      <div className="flex items-center justify-between">
        <Skeleton className="size-8 rounded-md" />
        <Skeleton className="h-5 w-28" />
        <Skeleton className="size-8 rounded-md" />
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-md" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}
