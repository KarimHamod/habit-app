import { Moon, Smile, Sparkles, Sun, type LucideIcon } from "lucide-react";
import Image from "next/image";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  companionPersona,
  type CompanionMood,
} from "@/lib/insights/companion-persona";
import type { GrowthStage } from "@/lib/insights/growth";

interface StageMeta {
  title: string;
  description: string;
}

const STAGE_META: Record<GrowthStage, StageMeta> = {
  0: {
    title: "Just getting started",
    description: "Complete a habit to start Leo's journey.",
  },
  1: {
    title: "Taking root",
    description: "Keep showing up — Leo is settling in.",
  },
  2: {
    title: "Growing steadily",
    description: "Consistent habits are helping Leo grow.",
  },
  3: {
    title: "Thriving",
    description: "Leo is blooming from your consistency.",
  },
};

/** Mood is announced as text; the icon only reinforces it. */
const MOOD_ICONS: Record<CompanionMood, LucideIcon> = {
  resting: Moon,
  ready: Sun,
  cheerful: Smile,
  glowing: Sparkles,
};

interface CompanionWidgetProps {
  stage: GrowthStage;
  rate: number;
  completedToday: number;
  totalToday: number;
  displayName: string | null;
}

/**
 * Side-rail widget on the Today page: a reflective, non-punitive growth visual.
 *
 * Two timescales, deliberately kept apart — the growth stage tracks a trailing
 * 30-day window and moves slowly, while Leo's mood and line reflect today only.
 * Both are derived, so the widget follows optimistic completion toggles without
 * any state of its own.
 */
export function CompanionWidget({
  stage,
  rate,
  completedToday,
  totalToday,
  displayName,
}: CompanionWidgetProps) {
  const meta = STAGE_META[stage];
  const persona = companionPersona({ completedToday, totalToday, displayName });
  const MoodIcon = MOOD_ICONS[persona.mood];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span>{persona.name}</span>
          {stage > 0 ? (
            <span className="text-muted-foreground text-sm font-normal">
              {Math.round(rate)}% over 30 days
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-accent flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl">
            <Image
              src="/companion/leo.png"
              alt=""
              width={128}
              height={128}
              className="size-full object-contain p-1"
              priority={false}
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{meta.title}</p>
            <p className="text-muted-foreground text-sm">{meta.description}</p>
          </div>
        </div>

        <p className="border-border text-muted-foreground rounded-2xl border border-dashed px-3 py-2 text-sm italic">
          “{persona.message}”
        </p>

        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <MoodIcon className="text-amber size-3.5" aria-hidden="true" />
          {persona.name} is {persona.moodLabel.toLowerCase()}
        </p>
      </CardContent>
    </Card>
  );
}
