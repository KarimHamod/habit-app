import type { HabitType } from "./types";

export const HABIT_FORM_STEPS = [
  "basics",
  "frequency",
  "type",
  "target",
  "schedule",
  "review",
] as const;
export type HabitFormStep = (typeof HABIT_FORM_STEPS)[number];

/** The target step only applies to quantity/duration habits — boolean habits skip straight past it. */
export function getStepOrder(type: HabitType): HabitFormStep[] {
  return type === "boolean"
    ? HABIT_FORM_STEPS.filter((step) => step !== "target")
    : [...HABIT_FORM_STEPS];
}

export function getNextStep(
  current: HabitFormStep,
  type: HabitType,
): HabitFormStep | null {
  const order = getStepOrder(type);
  const index = order.indexOf(current);
  return index === -1 || index === order.length - 1 ? null : order[index + 1];
}

export function getPreviousStep(
  current: HabitFormStep,
  type: HabitType,
): HabitFormStep | null {
  const order = getStepOrder(type);
  const index = order.indexOf(current);
  return index <= 0 ? null : order[index - 1];
}
