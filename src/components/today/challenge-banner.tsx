import Link from "next/link";

import type { ChallengeProgress } from "@/lib/challenges/types";

interface ChallengeBannerProps {
  challenge: ChallengeProgress;
}

/** Slim, single-line progress banner above the Today habit list — only rendered when a challenge is active. */
export function ChallengeBanner({ challenge }: ChallengeBannerProps) {
  return (
    <Link
      href={`/challenges/${challenge.id}`}
      className="bg-primary/10 flex items-center justify-between rounded-xl px-4 py-2.5 text-sm"
    >
      <span className="font-medium">{challenge.name}</span>
      <span className="text-muted-foreground">
        Day {challenge.dayNumber} of {challenge.durationDays} ·{" "}
        {Math.round(challenge.rate)}%
      </span>
    </Link>
  );
}
