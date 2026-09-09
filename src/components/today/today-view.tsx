"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";

import { completeHabit, uncompleteHabit } from "@/actions/completions";
import {
  buildCompletionPayload,
  calculateHabitProgress,
} from "@/lib/habits/completion";
import type { DaypartGreeting } from "@/lib/dates/timezone";
import { getTodayDateString } from "@/lib/dates/timezone";
import type { DailyFlowPoint } from "@/lib/insights/aggregate";
import type { GrowthStage } from "@/lib/insights/growth";
import {
  groupHabitsByPartOfDay,
  PART_OF_DAY_LABELS,
} from "@/lib/habits/part-of-day";
import type { TodayHabit } from "@/lib/habits/types";
import type { ChallengeProgress } from "@/lib/challenges/types";
import type { Reflection } from "@/lib/reflections/types";

import { ChallengeBanner } from "./challenge-banner";
import { CompanionWidget } from "./companion-widget";
import { TodayEmptyState } from "./empty-state";
import { HabitCard } from "./habit-card";
import { ProgressHeader } from "./progress-header";
import { ReflectionCard } from "./reflection-card";
import { WeeklyFlowCard } from "./weekly-flow-card";

type HabitAction =
  | { type: "complete"; habitId: string; value: number }
  | { type: "uncomplete"; habitId: string };

const GREETING_COPY: Record<DaypartGreeting, string> = {
  morning: "Good morning",
  afternoon: "Good afternoon",
  evening: "Good evening",
};

function streakDelta(wasCompleted: boolean, isCompleted: boolean): number {
  if (isCompleted && !wasCompleted) return 1;
  if (!isCompleted && wasCompleted) return -1;
  return 0;
}

function nextHabitState(habit: TodayHabit, action: HabitAction): TodayHabit {
  if (action.type === "uncomplete") {
    return {
      ...habit,
      completed: false,
      value: null,
      progress: 0,
      currentStreak: Math.max(
        0,
        habit.currentStreak + streakDelta(habit.completed, false),
      ),
    };
  }

  const payload = buildCompletionPayload({
    type: habit.type,
    value: action.value,
    target: habit.target,
  });
  // The client only ever submits values it already validated (non-negative,
  // present) — an error here would indicate a UI bug, not user input.
  if ("error" in payload) return habit;

  const progress =
    habit.type === "boolean"
      ? 100
      : calculateHabitProgress(payload.value, habit.target ?? 0);

  return {
    ...habit,
    completed: payload.completed,
    value: payload.value,
    progress,
    currentStreak: Math.max(
      0,
      habit.currentStreak + streakDelta(habit.completed, payload.completed),
    ),
  };
}

interface TodayViewProps {
  initialHabits: TodayHabit[];
  date: string;
  timezone: string;
  displayName: string | null;
  daypart: DaypartGreeting;
  friendlyDate: string;
  weeklyFlow: DailyFlowPoint[];
  weekConsistency: number;
  companionStage: GrowthStage;
  companionRate: number;
  activeChallenge: ChallengeProgress | null;
  reflection: Reflection | null;
}

export function TodayView({
  initialHabits,
  date,
  timezone,
  displayName,
  daypart,
  friendlyDate,
  weeklyFlow,
  weekConsistency,
  companionStage,
  companionRate,
  activeChallenge,
  reflection,
}: TodayViewProps) {
  const router = useRouter();
  const [habits, setHabits] = useState(initialHabits);
  const [optimisticHabits, applyOptimistic] = useOptimistic(
    habits,
    (state, action: HabitAction) =>
      state.map((h) =>
        h.id === action.habitId ? nextHabitState(h, action) : h,
      ),
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(habit: TodayHabit, action: HabitAction) {
    // The `date` prop is fixed at server-render time. If the viewer has
    // crossed into their next calendar day without a reload, submitting
    // against it would silently log the completion under the wrong day —
    // refresh to pick up the new day's data instead of writing anything.
    if (getTodayDateString(timezone) !== date) {
      router.refresh();
      return;
    }

    setError(null);
    startTransition(async () => {
      applyOptimistic(action);

      const result =
        action.type === "complete"
          ? await completeHabit(
              habit.id,
              date,
              habit.type,
              action.value,
              habit.target,
            )
          : await uncompleteHabit(habit.id, date);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      setHabits((prev) =>
        prev.map((h) => (h.id === habit.id ? nextHabitState(h, action) : h)),
      );
    });
  }

  function renderHabit(habit: TodayHabit) {
    return (
      <HabitCard
        habit={habit}
        pending={isPending}
        onToggleBoolean={() =>
          submit(
            habit,
            habit.completed
              ? { type: "uncomplete", habitId: habit.id }
              : { type: "complete", habitId: habit.id, value: 1 },
          )
        }
        onIncrement={() =>
          submit(habit, {
            type: "complete",
            habitId: habit.id,
            value: (habit.value ?? 0) + 1,
          })
        }
        onDecrement={() => {
          const next = (habit.value ?? 0) - 1;
          submit(
            habit,
            next <= 0
              ? { type: "uncomplete", habitId: habit.id }
              : { type: "complete", habitId: habit.id, value: next },
          );
        }}
        onSetValue={(value) =>
          submit(
            habit,
            value <= 0
              ? { type: "uncomplete", habitId: habit.id }
              : { type: "complete", habitId: habit.id, value },
          )
        }
      />
    );
  }

  const total = optimisticHabits.length;
  const completed = optimisticHabits.filter((h) => h.completed).length;
  const allComplete = total > 0 && completed === total;

  // Grouping is a pure render-time transform over the optimistic list, so
  // completion toggles and their rollback behaviour are untouched.
  const groups = groupHabitsByPartOfDay(optimisticHabits);
  // A user who has never assigned a part of day gets one "anytime" bucket;
  // labelling it would add a heading that carries no information, so the
  // list renders exactly as it did before this feature existed.
  const showGroupHeadings = !(
    groups.length === 1 && groups[0].part === "anytime"
  );

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-4 pb-24 md:max-w-2xl md:gap-8 md:p-8 md:pb-10 lg:max-w-5xl lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6 md:gap-8">
        {activeChallenge ? (
          <ChallengeBanner challenge={activeChallenge} />
        ) : null}
        <div>
          <h1 className="font-display text-2xl font-semibold md:text-3xl">
            {GREETING_COPY[daypart]}
            {displayName ? `, ${displayName}` : ""}
          </h1>
          <p className="text-muted-foreground">{friendlyDate}</p>
        </div>

        {total > 0 ? (
          <ProgressHeader completed={completed} total={total} />
        ) : null}

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}

        {total === 0 ? (
          <TodayEmptyState />
        ) : allComplete ? (
          <div
            role="status"
            className="border-mint/30 bg-mint/10 flex flex-col items-center gap-2 rounded-3xl border p-10 text-center"
          >
            <p className="text-3xl" aria-hidden="true">
              🎉
            </p>
            <p className="font-medium">All habits completed!</p>
            <p className="text-muted-foreground text-sm">Amazing work today.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 md:gap-8">
            {groups.map(({ part, habits: groupHabits }) => (
              <section
                key={part}
                aria-labelledby={showGroupHeadings ? `part-${part}` : undefined}
                className="flex flex-col gap-3"
              >
                {showGroupHeadings ? (
                  <h2
                    id={`part-${part}`}
                    className="font-display text-muted-foreground flex items-baseline justify-between text-sm font-semibold"
                  >
                    {PART_OF_DAY_LABELS[part]}
                    <span className="text-xs font-medium">
                      {groupHabits.filter((h) => h.completed).length} of{" "}
                      {groupHabits.length} done
                    </span>
                  </h2>
                ) : null}
                <ul className="flex flex-col gap-3 md:grid md:grid-cols-2">
                  {groupHabits.map((habit) => (
                    <li key={habit.id}>{renderHabit(habit)}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      <aside className="flex w-full flex-col gap-6 lg:w-72 lg:shrink-0">
        <CompanionWidget stage={companionStage} rate={companionRate} />
        <WeeklyFlowCard flow={weeklyFlow} consistency={weekConsistency} />
        <ReflectionCard reflection={reflection} />
      </aside>
    </div>
  );
}
