"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";

import { createHabit, updateHabit } from "@/actions/habits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  getNextStep,
  getPreviousStep,
  getStepOrder,
  type HabitFormStep,
} from "@/lib/habits/form-steps";
import { describeFrequency } from "@/lib/habits/format";
import { habitSchema, type HabitInput } from "@/lib/habits/validation";

import { NewCategoryDialog } from "./new-category-dialog";

const STEP_FIELDS: Record<HabitFormStep, (keyof HabitInput)[]> = {
  basics: ["name", "description", "categoryId", "color"],
  frequency: ["frequencyType", "daysOfWeek", "timesPerPeriod"],
  type: ["type"],
  target: ["target", "unit"],
  schedule: ["startDate", "endDate", "reminderEnabled", "reminderTime"],
  review: [],
};

const STEP_LABELS: Record<HabitFormStep, string> = {
  basics: "What habit do you want to build?",
  frequency: "How often?",
  type: "What are you tracking?",
  target: "Set your target",
  schedule: "Dates & reminders",
  review: "Review",
};

const WEEKDAYS = [
  { value: "0", label: "S" },
  { value: "1", label: "M" },
  { value: "2", label: "T" },
  { value: "3", label: "W" },
  { value: "4", label: "T" },
  { value: "5", label: "F" },
  { value: "6", label: "S" },
];

const COLOR_SWATCHES = [
  "#8b5cf6",
  "#3b82f6",
  "#06b6d4",
  "#22c55e",
  "#f97316",
  "#ef4444",
  "#ec4899",
  "#64748b",
];

type FrequencyPreset = "daily" | "weekdays" | "specific_days" | "weekly";
const WEEKDAY_VALUES = [1, 2, 3, 4, 5];

function presetFromValues(
  frequencyType: HabitInput["frequencyType"],
  daysOfWeek?: number[],
): FrequencyPreset {
  if (frequencyType === "weekly") return "weekly";
  if (frequencyType === "specific_days" || frequencyType === "custom") {
    const sorted = [...(daysOfWeek ?? [])].sort();
    if (
      sorted.length === WEEKDAY_VALUES.length &&
      sorted.every((d, i) => d === WEEKDAY_VALUES[i])
    ) {
      return "weekdays";
    }
    return "specific_days";
  }
  return "daily";
}

export interface Category {
  id: string;
  name: string;
  color: string | null;
}

interface HabitFormProps {
  mode: "create" | "edit";
  habitId?: string;
  categories: Category[];
  defaultStartDate: string;
  defaultValues?: Partial<HabitInput>;
}

export function HabitForm({
  mode,
  habitId,
  categories: initialCategories,
  defaultStartDate,
  defaultValues,
}: HabitFormProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [step, setStep] = useState<HabitFormStep>("basics");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm<HabitInput>({
    // @hookform/resolvers@5.9.1's bundled `Resolver` type structurally
    // diverges from react-hook-form@7.87.0's own — a known upstream typing
    // gap between their latest releases, not a runtime issue.
    resolver: zodResolver(habitSchema) as Resolver<HabitInput>,
    defaultValues: {
      type: "boolean",
      frequencyType: "daily",
      startDate: defaultStartDate,
      reminderEnabled: false,
      ...defaultValues,
    },
  });

  const type = watch("type");
  const daysOfWeek = watch("daysOfWeek");
  const reminderEnabled = watch("reminderEnabled");
  const [preset, setPreset] = useState<FrequencyPreset>(() =>
    presetFromValues(
      defaultValues?.frequencyType ?? "daily",
      defaultValues?.daysOfWeek,
    ),
  );

  const stepOrder = useMemo(() => getStepOrder(type), [type]);
  const stepIndex = stepOrder.indexOf(step);

  function applyPreset(next: FrequencyPreset) {
    setPreset(next);
    if (next === "daily") {
      setValue("frequencyType", "daily");
      setValue("daysOfWeek", undefined);
      setValue("timesPerPeriod", undefined);
    } else if (next === "weekdays") {
      setValue("frequencyType", "specific_days");
      setValue("daysOfWeek", WEEKDAY_VALUES);
      setValue("timesPerPeriod", undefined);
    } else if (next === "specific_days") {
      setValue("frequencyType", "specific_days");
      setValue("daysOfWeek", daysOfWeek?.length ? daysOfWeek : []);
      setValue("timesPerPeriod", undefined);
    } else {
      setValue("frequencyType", "weekly");
      setValue("daysOfWeek", undefined);
      setValue("timesPerPeriod", 3);
    }
  }

  async function goNext() {
    const fields = STEP_FIELDS[step];
    const valid = fields.length === 0 || (await trigger(fields));
    if (!valid) return;
    const next = getNextStep(step, type);
    if (next) setStep(next);
  }

  function goBack() {
    const previous = getPreviousStep(step, type);
    if (previous) setStep(previous);
  }

  async function onSubmit(data: HabitInput) {
    setSubmitError(null);
    setIsSubmitting(true);
    // On success, createHabit/updateHabit redirect to /today themselves —
    // this only ever returns here on the error path.
    const result =
      mode === "create"
        ? await createHabit(data)
        : await updateHabit(habitId!, data);
    setIsSubmitting(false);

    if ("error" in result) {
      setSubmitError(result.error);
    }
  }

  const isLastStep = step === "review";

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-4">
      <div>
        <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Step {stepIndex + 1} of {stepOrder.length}
        </p>
        <h1 className="mt-1 text-xl font-bold">{STEP_LABELS[step]}</h1>
      </div>

      <form
        onSubmit={
          isLastStep ? handleSubmit(onSubmit) : (e) => e.preventDefault()
        }
        className="flex flex-col gap-6"
      >
        {step === "basics" ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Habit name</Label>
              <Input
                id="name"
                autoFocus
                placeholder="Meditation"
                {...register("name")}
              />
              {errors.name ? (
                <p role="alert" className="text-destructive text-sm">
                  {errors.name.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Why this habit matters to you"
                {...register("description")}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="category">Category (optional)</Label>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select
                    value={field.value ?? "none"}
                    onValueChange={(value) =>
                      field.onChange(value === "none" ? undefined : value)
                    }
                    items={{
                      none: "No category",
                      ...Object.fromEntries(
                        categories.map((c) => [c.id, c.name]),
                      ),
                    }}
                  >
                    <SelectTrigger id="category" className="w-full">
                      <SelectValue placeholder="No category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No category</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <NewCategoryDialog
                onCreated={(category) => {
                  setCategories((prev) => [...prev, category]);
                  setValue("categoryId", category.id);
                }}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Color</Label>
              <Controller
                control={control}
                name="color"
                render={({ field }) => (
                  <div
                    className="flex flex-wrap gap-2"
                    role="radiogroup"
                    aria-label="Habit color"
                  >
                    {COLOR_SWATCHES.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        role="radio"
                        aria-checked={field.value === hex}
                        aria-label={`Use color ${hex}`}
                        onClick={() => field.onChange(hex)}
                        className="focus-visible:ring-ring size-8 rounded-full ring-offset-2 outline-none focus-visible:ring-2"
                        style={{
                          backgroundColor: hex,
                          boxShadow:
                            field.value === hex
                              ? `0 0 0 2px var(--background), 0 0 0 4px ${hex}`
                              : undefined,
                        }}
                      />
                    ))}
                  </div>
                )}
              />
            </div>
          </div>
        ) : null}

        {step === "frequency" ? (
          <div className="flex flex-col gap-4">
            <RadioGroup
              value={preset}
              onValueChange={(value) => applyPreset(value as FrequencyPreset)}
            >
              {(
                [
                  { value: "daily", label: "Daily", description: "Every day" },
                  {
                    value: "weekdays",
                    label: "Weekdays",
                    description: "Monday through Friday",
                  },
                  {
                    value: "specific_days",
                    label: "Specific days",
                    description: "Choose which days",
                  },
                  {
                    value: "weekly",
                    label: "A few times a week",
                    description: "Flexible — any days",
                  },
                ] as const
              ).map((option) => (
                <label
                  key={option.value}
                  className="has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5 flex cursor-pointer items-center gap-3 rounded-xl border p-4"
                >
                  <RadioGroupItem value={option.value} />
                  <div>
                    <p className="font-medium">{option.label}</p>
                    <p className="text-muted-foreground text-sm">
                      {option.description}
                    </p>
                  </div>
                </label>
              ))}
            </RadioGroup>

            {preset === "specific_days" ? (
              <div className="flex flex-col gap-2">
                <Label>Which days?</Label>
                <Controller
                  control={control}
                  name="daysOfWeek"
                  render={({ field }) => (
                    <ToggleGroup
                      multiple
                      value={(field.value ?? []).map(String)}
                      onValueChange={(values) =>
                        field.onChange(values.map(Number))
                      }
                    >
                      {WEEKDAYS.map((day) => (
                        <ToggleGroupItem
                          key={day.value}
                          value={day.value}
                          aria-label={day.label}
                          className="rounded-full"
                        >
                          {day.label}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  )}
                />
                {errors.daysOfWeek ? (
                  <p role="alert" className="text-destructive text-sm">
                    {errors.daysOfWeek.message}
                  </p>
                ) : null}
              </div>
            ) : null}

            {preset === "weekly" ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="timesPerPeriod">Times per week</Label>
                <Input
                  id="timesPerPeriod"
                  type="number"
                  min={1}
                  max={7}
                  {...register("timesPerPeriod")}
                />
                {errors.timesPerPeriod ? (
                  <p role="alert" className="text-destructive text-sm">
                    {errors.timesPerPeriod.message}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {step === "type" ? (
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  if (value === "boolean") {
                    setValue("target", undefined);
                    setValue("unit", undefined);
                  }
                }}
              >
                {(
                  [
                    {
                      value: "boolean",
                      label: "Yes / No",
                      description: "Simple done-or-not tracking",
                    },
                    {
                      value: "quantity",
                      label: "Quantity",
                      description: "Track an amount, like glasses of water",
                    },
                    {
                      value: "duration",
                      label: "Duration",
                      description: "Track time spent, like minutes",
                    },
                  ] as const
                ).map((option) => (
                  <label
                    key={option.value}
                    className="has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5 flex cursor-pointer items-center gap-3 rounded-xl border p-4"
                  >
                    <RadioGroupItem value={option.value} />
                    <div>
                      <p className="font-medium">{option.label}</p>
                      <p className="text-muted-foreground text-sm">
                        {option.description}
                      </p>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            )}
          />
        ) : null}

        {step === "target" ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="target">Target</Label>
              <Input
                id="target"
                type="number"
                min={1}
                placeholder="8"
                {...register("target")}
              />
              {errors.target ? (
                <p role="alert" className="text-destructive text-sm">
                  {errors.target.message}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                placeholder={type === "duration" ? "minutes" : "glasses"}
                {...register("unit")}
              />
            </div>
          </div>
        ) : null}

        {step === "schedule" ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="startDate">Start date</Label>
              <Input id="startDate" type="date" {...register("startDate")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="endDate">End date (optional)</Label>
              <Input id="endDate" type="date" {...register("endDate")} />
              {errors.endDate ? (
                <p role="alert" className="text-destructive text-sm">
                  {errors.endDate.message}
                </p>
              ) : null}
            </div>
            <div className="flex items-center justify-between rounded-xl border p-4">
              <div>
                <Label htmlFor="reminderEnabled">Reminder</Label>
                <p className="text-muted-foreground text-sm">
                  Get a daily nudge for this habit
                </p>
              </div>
              <Controller
                control={control}
                name="reminderEnabled"
                render={({ field }) => (
                  <Switch
                    id="reminderEnabled"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
            {reminderEnabled ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="reminderTime">Reminder time</Label>
                <Input
                  id="reminderTime"
                  type="time"
                  {...register("reminderTime")}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {step === "review" ? (
          <ReviewSummary data={watch()} categories={categories} />
        ) : null}

        {submitError ? (
          <p role="alert" className="text-destructive text-sm">
            {submitError}
          </p>
        ) : null}

        <div className="flex gap-3">
          {stepIndex > 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              className="flex-1"
            >
              Back
            </Button>
          ) : null}
          {isLastStep ? (
            <Button
              key="submit"
              type="submit"
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Saving…"
                : mode === "create"
                  ? "Create Habit"
                  : "Save Changes"}
            </Button>
          ) : (
            <Button
              key="next"
              type="button"
              onClick={goNext}
              className="flex-1"
            >
              Next
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function ReviewSummary({
  data,
  categories,
}: {
  data: HabitInput;
  categories: Category[];
}) {
  const category = categories.find((c) => c.id === data.categoryId);

  const rows: [string, string][] = [
    ["Name", data.name || "—"],
    ["Category", category?.name ?? "None"],
    [
      "Frequency",
      describeFrequency(
        data.frequencyType,
        data.daysOfWeek,
        data.timesPerPeriod,
      ),
    ],
    [
      "Type",
      { boolean: "Yes / No", quantity: "Quantity", duration: "Duration" }[
        data.type
      ],
    ],
  ];
  if (data.type !== "boolean") {
    rows.push(["Target", `${data.target ?? "—"} ${data.unit ?? ""}`.trim()]);
  }
  rows.push(["Start date", data.startDate]);
  if (data.endDate) rows.push(["End date", data.endDate]);
  rows.push([
    "Reminder",
    data.reminderEnabled ? (data.reminderTime ?? "Enabled") : "Off",
  ]);

  return (
    <dl className="flex flex-col divide-y rounded-xl border">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex items-center justify-between px-4 py-3"
        >
          <dt className="text-muted-foreground text-sm">{label}</dt>
          <dd className="text-sm font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
