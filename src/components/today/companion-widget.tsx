import { Flower2, Leaf, Sprout, type LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GrowthStage } from "@/lib/insights/growth";
import { cn } from "@/lib/utils";

interface StageMeta {
  icon: LucideIcon;
  title: string;
  description: string;
  filled: boolean;
}

const STAGE_META: Record<GrowthStage, StageMeta> = {
  0: {
    icon: Sprout,
    title: "Just getting started",
    description: "Complete a habit to start your companion's journey.",
    filled: false,
  },
  1: {
    icon: Sprout,
    title: "Taking root",
    description: "Keep showing up — your companion is settling in.",
    filled: false,
  },
  2: {
    icon: Leaf,
    title: "Growing steadily",
    description: "Consistent habits are helping your companion grow.",
    filled: false,
  },
  3: {
    icon: Flower2,
    title: "Thriving",
    description: "Your companion is blooming from your consistency.",
    filled: true,
  },
};

interface CompanionWidgetProps {
  stage: GrowthStage;
  rate: number;
}

/** Side-rail widget on the Today page: a reflective, non-punitive growth visual driven by trailing 30-day consistency. */
export function CompanionWidget({ stage, rate }: CompanionWidgetProps) {
  const meta = STAGE_META[stage];
  const Icon = meta.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Companion</span>
          {stage > 0 ? (
            <span className="text-muted-foreground text-sm font-normal">
              {Math.round(rate)}% over 30 days
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full",
              meta.filled
                ? "bg-primary text-primary-foreground"
                : "bg-primary/10 text-primary",
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold">{meta.title}</p>
            <p className="text-muted-foreground text-sm">
              {meta.description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
