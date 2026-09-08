export type GrowthStage = 0 | 1 | 2 | 3;

/**
 * Maps a trailing-window completion rate to a companion growth stage.
 *
 * Guard: `scheduledCount === 0` (nothing scheduled yet in the window, e.g. a
 * brand-new account) always returns stage 0, regardless of `rate` — mirrors
 * `rankHabitPerformance`'s `scheduledCount` guard so a habit with no history
 * never misleadingly reads as 0%.
 *
 * The top stage is reserved at 75%, not 100% (unlike `completion-heatmap.tsx`'s
 * single-day `levelFor()`, where 100% is a normal daily outcome). Requiring a
 * literal 100% over a 30-day aggregate would mean any single missed day locks
 * the user out of the best stage — that reads as punishing, which fails
 * CLAUDE.md's gamification test (support consistency, don't pressure/manipulate).
 */
export function growthStageFor(rate: number, scheduledCount: number): GrowthStage {
  if (scheduledCount === 0) return 0;
  if (rate < 40) return 1;
  if (rate < 75) return 2;
  return 3;
}
