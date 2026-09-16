"use client";

import { AlertTriangle, CalendarPlus, Check, Clock3, Trash2, Undo2, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDueBadge } from "@/lib/todos/due-date";
import type { Todo } from "@/lib/todos/types";
import { cn } from "@/lib/utils";

interface TodoItemProps {
  todo: Todo;
  pending: boolean;
  today: string;
  overdue: boolean;
  onToggle: () => void;
  onPark: () => void;
  onDelete: () => void;
  onSetDueDate: (dueDate: string | null, dueTime: string | null) => void;
}

/** One row in either the active or "Later" list — the two lists share this component; only the park icon/label differ. */
export function TodoItem({
  todo,
  pending,
  today,
  overdue,
  onToggle,
  onPark,
  onDelete,
  onSetDueDate,
}: TodoItemProps) {
  const [editingDue, setEditingDue] = useState(false);
  const dueBadge = formatDueBadge(todo, today);

  function handleDueSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const date = String(form.get("dueDate") || "");
    const time = String(form.get("dueTime") || "");
    onSetDueDate(date || null, date ? time || null : null);
    setEditingDue(false);
  }

  return (
    <div className="border-border bg-card flex flex-col gap-2 rounded-xl border p-3">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="icon"
          variant={todo.done ? "default" : "outline"}
          className="shrink-0 rounded-full"
          onClick={onToggle}
          disabled={pending}
          aria-pressed={todo.done}
          aria-label={
            todo.done ? `Mark "${todo.title}" as not done` : `Mark "${todo.title}" as done`
          }
        >
          {todo.done ? <Check className="size-4" aria-hidden="true" /> : null}
        </Button>

        <p
          className={cn(
            "min-w-0 flex-1 truncate",
            todo.done && "text-muted-foreground line-through",
          )}
        >
          {todo.title}
        </p>

        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="shrink-0"
          onClick={onPark}
          disabled={pending}
          aria-label={todo.parked ? `Move "${todo.title}" to To do` : `Move "${todo.title}" to Later`}
        >
          {todo.parked ? (
            <Undo2 className="size-4" aria-hidden="true" />
          ) : (
            <Clock3 className="size-4" aria-hidden="true" />
          )}
        </Button>

        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="text-muted-foreground hover:text-destructive shrink-0"
          onClick={onDelete}
          disabled={pending}
          aria-label={`Delete "${todo.title}"`}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {editingDue ? (
        <form
          onSubmit={handleDueSubmit}
          className="border-border bg-muted/40 flex flex-wrap items-center gap-2 rounded-lg border p-2 pl-11"
        >
          <Input
            type="date"
            name="dueDate"
            aria-label="Due date"
            defaultValue={todo.dueDate ?? ""}
            disabled={pending}
            className="w-auto"
          />
          <Input
            type="time"
            name="dueTime"
            aria-label="Due time (optional)"
            defaultValue={todo.dueTime ?? ""}
            disabled={pending}
            className="w-auto"
          />
          <Button type="submit" size="sm" variant="secondary" disabled={pending}>
            Save
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={() => setEditingDue(false)}
            disabled={pending}
            aria-label="Cancel editing due date"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setEditingDue(true)}
          disabled={pending}
          className={cn(
            "text-muted-foreground hover:text-foreground ml-11 flex w-fit items-center gap-1 text-xs disabled:pointer-events-none disabled:opacity-50",
            overdue && "text-destructive font-medium",
          )}
        >
          {overdue ? <AlertTriangle className="size-3.5" aria-hidden="true" /> : <CalendarPlus className="size-3.5" aria-hidden="true" />}
          {dueBadge ? `${overdue ? "Overdue — " : ""}${dueBadge}` : "Add due date"}
        </button>
      )}
    </div>
  );
}
