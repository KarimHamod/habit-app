import { Skeleton } from "@/components/ui/skeleton";

export default function TodosLoading() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-4 pb-24">
      <Skeleton className="h-8 w-32" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    </div>
  );
}
