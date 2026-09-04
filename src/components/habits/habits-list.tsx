"use client";

import Link from "next/link";
import { MoreVertical } from "lucide-react";
import { useMemo, useState } from "react";

import { archiveHabit, deleteHabit, restoreHabit } from "@/actions/habits";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { describeFrequency } from "@/lib/habits/format";
import type { FrequencyType, HabitType } from "@/lib/habits/types";

export interface Category {
  id: string;
  name: string;
  color: string | null;
}

export interface HabitRow {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  type: HabitType;
  frequency_type: FrequencyType;
  is_archived: boolean;
  target: number | null;
  unit: string | null;
  created_at: string;
  habit_schedules:
    | { days_of_week: number[] | null; times_per_period: number | null }[]
    | { days_of_week: number[] | null; times_per_period: number | null }
    | null;
  categories: Category | null;
}

type SortOption = "name" | "newest" | "oldest";

interface HabitsListProps {
  habits: HabitRow[];
  categories: Category[];
}

function getSchedule(habit: HabitRow) {
  return Array.isArray(habit.habit_schedules)
    ? habit.habit_schedules[0]
    : habit.habit_schedules;
}

export function HabitsList({
  habits: initialHabits,
  categories,
}: HabitsListProps) {
  const [habits, setHabits] = useState(initialHabits);
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [habitToDelete, setHabitToDelete] = useState<HabitRow | null>(null);

  const visibleHabits = useMemo(() => {
    let list = habits.filter((h) => h.is_archived === (tab === "archived"));

    if (categoryFilter !== "all") {
      list = list.filter((h) => h.categories?.id === categoryFilter);
    }

    list = [...list].sort((a, b) => {
      if (sortBy === "newest") return b.created_at.localeCompare(a.created_at);
      if (sortBy === "oldest") return a.created_at.localeCompare(b.created_at);
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [habits, tab, categoryFilter, sortBy]);

  async function handleArchiveToggle(habit: HabitRow) {
    setError(null);
    setPendingId(habit.id);
    const result = habit.is_archived
      ? await restoreHabit(habit.id)
      : await archiveHabit(habit.id);
    setPendingId(null);

    if ("error" in result) {
      setError(result.error);
      return;
    }
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habit.id ? { ...h, is_archived: !h.is_archived } : h,
      ),
    );
  }

  async function handleDelete() {
    if (!habitToDelete) return;
    setError(null);
    setPendingId(habitToDelete.id);
    const result = await deleteHabit(habitToDelete.id);
    setPendingId(null);

    if ("error" in result) {
      setError(result.error);
      return;
    }
    setHabits((prev) => prev.filter((h) => h.id !== habitToDelete.id));
    setHabitToDelete(null);
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Habits</h1>
        <Button
          nativeButton={false}
          render={<Link href="/habits/new">New Habit</Link>}
        />
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as "active" | "archived")}
      >
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
      </Tabs>

      {categories.length > 0 || habits.length > 0 ? (
        <div className="flex gap-2">
          <Select
            value={categoryFilter}
            onValueChange={(value) => setCategoryFilter(value ?? "all")}
            items={{
              all: "All categories",
              ...Object.fromEntries(categories.map((c) => [c.id, c.name])),
            }}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sortBy}
            onValueChange={(value) =>
              setSortBy((value ?? "name") as SortOption)
            }
            items={{
              name: "Name (A–Z)",
              newest: "Newest first",
              oldest: "Oldest first",
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name (A–Z)</SelectItem>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      {visibleHabits.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
          {tab === "active" ? (
            <>
              <p className="font-medium">No active habits.</p>
              <p className="text-muted-foreground text-sm">
                Create one to get started.
              </p>
              <Button
                nativeButton={false}
                render={<Link href="/habits/new">New Habit</Link>}
              />
            </>
          ) : (
            <p className="text-muted-foreground text-sm">No archived habits.</p>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {visibleHabits.map((habit) => {
            const schedule = getSchedule(habit);
            return (
              <li
                key={habit.id}
                className="bg-card flex items-center gap-3 rounded-xl border p-4"
              >
                <Link
                  href={`/habits/${habit.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                    style={{
                      backgroundColor:
                        habit.color ?? "var(--color-muted-foreground)",
                    }}
                    aria-hidden="true"
                  >
                    {habit.icon ?? habit.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{habit.name}</p>
                    <p className="text-muted-foreground truncate text-sm">
                      {describeFrequency(
                        habit.frequency_type,
                        schedule?.days_of_week,
                        schedule?.times_per_period,
                      )}
                    </p>
                    {habit.categories ? (
                      <Badge variant="secondary" className="mt-1">
                        {habit.categories.name}
                      </Badge>
                    ) : null}
                  </div>
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={pendingId === habit.id}
                        aria-label={`Actions for ${habit.name}`}
                      />
                    }
                  >
                    <MoreVertical className="size-4" aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      render={<Link href={`/habits/${habit.id}/edit`} />}
                    >
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleArchiveToggle(habit)}
                    >
                      {habit.is_archived ? "Restore" : "Archive"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setHabitToDelete(habit)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog
        open={habitToDelete !== null}
        onOpenChange={(open) => !open && setHabitToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {habitToDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the habit and all of its completion
              history. This can&apos;t be undone — if you just want to stop
              tracking it for now, archive it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
