import { Skeleton } from "@/components/ui/skeleton";

export default function InsightsLoading() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-4">
      <Skeleton className="h-8 w-28" />
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-10 rounded-lg" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-56 rounded-xl" />
    </div>
  );
}
