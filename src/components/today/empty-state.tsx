import Link from "next/link";

import { Button } from "@/components/ui/button";

export function TodayEmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
      <div>
        <p className="font-medium">No habits scheduled today.</p>
        <p className="text-muted-foreground text-sm">Build your first habit.</p>
      </div>
      <Button
        nativeButton={false}
        render={<Link href="/habits/new">Create Habit</Link>}
      />
    </div>
  );
}
