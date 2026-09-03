import { Sparkles } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function TodayEmptyState() {
  return (
    <div className="border-border bg-card flex flex-col items-center gap-3 rounded-3xl border border-dashed p-10 text-center">
      <div
        className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-2xl"
        aria-hidden="true"
      >
        <Sparkles className="size-6" />
      </div>
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
