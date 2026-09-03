"use client";

import { Check, Flame, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { TodayHabit } from "@/lib/habits/types";
import { cn } from "@/lib/utils";

interface HabitCardProps {
  habit: TodayHabit;
  pending: boolean;
  onToggleBoolean: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}

export function HabitCard({
  habit,
  pending,
  onToggleBoolean,
  onIncrement,
  onDecrement,
}: HabitCardProps) {
  const accent = habit.color ?? "var(--color-muted-foreground)";
  const subtitle =
    habit.type === "boolean"
      ? habit.target && habit.unit
        ? `${habit.target} ${habit.unit}`
        : null
      : `${habit.value ?? 0} / ${habit.target ?? 0}${habit.unit ? ` ${habit.unit}` : ""}`;

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 overflow-hidden rounded-2xl border p-4 transition-colors",
        habit.completed
          ? "border-transparent bg-[color-mix(in_oklch,var(--card),var(--habit-accent)_14%)]"
          : "border-border bg-card",
      )}
      style={{ "--habit-accent": accent } as React.CSSProperties}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1 rounded-r-full"
        style={{ backgroundColor: accent }}
      />

      <div
        className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold text-white"
        style={{ backgroundColor: accent }}
        aria-hidden="true"
      >
        {habit.icon ?? habit.name.charAt(0).toUpperCase()}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{habit.name}</p>
        {subtitle ? (
          <p className="text-muted-foreground truncate text-sm">{subtitle}</p>
        ) : null}
        {habit.type !== "boolean" ? (
          <div
            className="bg-muted mt-2 h-1.5 w-full overflow-hidden rounded-full"
            role="progressbar"
            aria-valuenow={habit.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${habit.name} progress`}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${habit.progress}%`, backgroundColor: accent }}
            />
          </div>
        ) : null}
        {habit.currentStreak > 0 ? (
          <p className="text-muted-foreground mt-1.5 flex items-center gap-1 text-xs">
            <Flame className="text-coral size-3.5" aria-hidden="true" />
            {habit.currentStreak} day streak
          </p>
        ) : null}
      </div>

      {habit.type === "boolean" ? (
        <Button
          type="button"
          size="icon"
          variant={habit.completed ? "default" : "outline"}
          className="size-9 shrink-0 rounded-full"
          style={
            habit.completed
              ? { backgroundColor: accent, borderColor: accent }
              : undefined
          }
          onClick={onToggleBoolean}
          disabled={pending}
          aria-pressed={habit.completed}
          aria-label={
            habit.completed
              ? `Mark ${habit.name} as not done`
              : `Mark ${habit.name} as done`
          }
        >
          {habit.completed ? (
            <Check className="size-4" aria-hidden="true" />
          ) : null}
        </Button>
      ) : (
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-8 rounded-full"
            onClick={onDecrement}
            disabled={pending || !habit.value}
            aria-label={`Remove one from ${habit.name}`}
          >
            <Minus className="size-3.5" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant={habit.completed ? "default" : "outline"}
            className="size-8 rounded-full"
            onClick={onIncrement}
            disabled={pending}
            aria-label={`Add one to ${habit.name}`}
          >
            <Plus className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}
