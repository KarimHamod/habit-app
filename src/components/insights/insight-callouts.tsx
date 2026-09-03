import { Sparkles, TriangleAlert } from "lucide-react";

import type { Insight } from "@/lib/insights/engine";
import { cn } from "@/lib/utils";

const MAX_VISIBLE = 3;

interface InsightCalloutsProps {
  insights: Insight[];
}

export function InsightCallouts({ insights }: InsightCalloutsProps) {
  if (insights.length === 0) return null;

  return (
    <ul className="flex flex-col gap-2">
      {insights.slice(0, MAX_VISIBLE).map((insight) => (
        <li
          key={insight.message}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
            insight.tone === "positive"
              ? "border-primary/20 bg-primary/5 text-foreground"
              : "border-destructive/20 bg-destructive/5 text-foreground",
          )}
        >
          {insight.tone === "positive" ? (
            <Sparkles
              className="text-primary size-4 shrink-0"
              aria-hidden="true"
            />
          ) : (
            <TriangleAlert
              className="text-destructive size-4 shrink-0"
              aria-hidden="true"
            />
          )}
          {insight.message}
        </li>
      ))}
    </ul>
  );
}
