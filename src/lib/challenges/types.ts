import type { HabitPerformance } from "@/lib/insights/aggregate";

/** An active challenge, as shown on Today's banner and the top of /challenges. */
export interface ChallengeProgress {
  id: string;
  name: string;
  startDate: string;
  durationDays: number;
  /** 1-indexed day number for "today" within the challenge. */
  dayNumber: number;
  /** Overall completion rate (0-100) across all linked habits, start_date through today. */
  rate: number;
  habits: HabitPerformance[];
}

/** Full detail for /challenges/[id] — active or ended. */
export interface ChallengeDetail extends ChallengeProgress {
  isActive: boolean;
  endDate: string;
}

/** A row in the past-challenges list — no per-habit breakdown, just the final numbers. */
export interface ChallengeSummary {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  rate: number;
}
