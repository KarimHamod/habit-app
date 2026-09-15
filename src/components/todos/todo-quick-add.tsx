"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TODO_TITLE_MAX_LENGTH } from "@/lib/todos/validation";

interface TodoQuickAddProps {
  pending: boolean;
  onAdd: (title: string) => void;
}

/** Inline add row at the bottom of the "To do" list. Always adds to the active list — parking an item is a separate per-row action. */
export function TodoQuickAdd({ pending, onAdd }: TodoQuickAddProps) {
  const [title, setTitle] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setTitle("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        aria-label="Add a to-do"
        placeholder="Add a to-do…"
        value={title}
        maxLength={TODO_TITLE_MAX_LENGTH}
        onChange={(event) => setTitle(event.target.value)}
        disabled={pending}
      />
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
    </form>
  );
}
