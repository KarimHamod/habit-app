"use client";

import { CalendarPlus, Plus, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addDays } from "@/lib/dates/date-string";
import { TODO_TITLE_MAX_LENGTH } from "@/lib/todos/validation";

interface TodoQuickAddProps {
  pending: boolean;
  today: string;
  onAdd: (title: string, dueDate: string | null, dueTime: string | null) => void;
}

/**
 * Inline add row at the bottom of the "To do" list. Always adds to the
 * active list — parking an item is a separate per-row action. The due-date
 * picker is collapsed by default so a plain title-only add stays a single
 * field, matching the pre-due-date flow.
 */
export function TodoQuickAdd({ pending, today, onAdd }: TodoQuickAddProps) {
  const [title, setTitle] = useState("");
  const [showDue, setShowDue] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");

  const tomorrow = addDays(today, 1);

  function reset() {
    setTitle("");
    setShowDue(false);
    setDueDate("");
    setDueTime("");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(trimmed, dueDate || null, dueDate ? dueTime || null : null);
    reset();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input
          aria-label="Add a to-do"
          placeholder="Add a to-do…"
          value={title}
          maxLength={TODO_TITLE_MAX_LENGTH}
          onChange={(event) => setTitle(event.target.value)}
          disabled={pending}
        />
        <Button
          type="button"
          size="icon"
          variant={showDue ? "secondary" : "outline"}
          className="shrink-0 rounded-full"
          onClick={() => setShowDue((prev) => !prev)}
          disabled={pending}
          aria-pressed={showDue}
          aria-label={showDue ? "Remove due date" : "Add a due date"}
        >
          <CalendarPlus className="size-4" aria-hidden="true" />
        </Button>
        <Button
          type="submit"
          size="icon"
          variant="outline"
          className="shrink-0 rounded-full"
          disabled={pending || title.trim().length === 0}
          aria-label="Add to-do"
        >
          <Plus className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {showDue ? (
        <div className="border-border bg-muted/40 flex flex-wrap items-center gap-2 rounded-xl border p-2">
          <div className="flex gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={dueDate === today ? "secondary" : "outline"}
              onClick={() => setDueDate(today)}
              disabled={pending}
            >
              Today
            </Button>
            <Button
              type="button"
              size="sm"
              variant={dueDate === tomorrow ? "secondary" : "outline"}
              onClick={() => setDueDate(tomorrow)}
              disabled={pending}
            >
              Tomorrow
            </Button>
          </div>
          <Input
            type="date"
            aria-label="Due date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            disabled={pending}
            className="w-auto"
          />
          <Input
            type="time"
            aria-label="Due time (optional)"
            value={dueTime}
            onChange={(event) => setDueTime(event.target.value)}
            disabled={pending || !dueDate}
            className="w-auto"
          />
          {dueDate ? (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => {
                setDueDate("");
                setDueTime("");
              }}
              disabled={pending}
              aria-label="Clear due date"
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
