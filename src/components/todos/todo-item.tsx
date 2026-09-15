"use client";

import { Check, Clock3, Trash2, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Todo } from "@/lib/todos/types";
import { cn } from "@/lib/utils";

interface TodoItemProps {
  todo: Todo;
  pending: boolean;
  onToggle: () => void;
  onPark: () => void;
  onDelete: () => void;
}

/** One row in either the active or "Later" list — the two lists share this component; only the park icon/label differ. */
export function TodoItem({ todo, pending, onToggle, onPark, onDelete }: TodoItemProps) {
  return (
    <div className="border-border bg-card flex items-center gap-3 rounded-xl border p-3">
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
  );
}
