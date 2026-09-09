import { Skeleton } from "@/components/ui/skeleton";

export default function JournalLoading() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-4 pb-24">
      <Skeleton className="h-8 w-48" />
      <div className="ring-foreground/10 flex flex-col gap-4 rounded-xl p-4 ring-1">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="ring-foreground/10 flex flex-col gap-4 rounded-xl p-4 ring-1">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
    </div>
  );
}
