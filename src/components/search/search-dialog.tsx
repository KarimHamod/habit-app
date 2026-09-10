"use client";

import { BookOpen, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import { searchEverything } from "@/actions/search";
import { HabitAvatar } from "@/components/habits/habit-avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatFriendlyDate } from "@/lib/dates/date-string";
import { MIN_QUERY_LENGTH, normalizeSearchQuery } from "@/lib/search/query";
import type { SearchResults } from "@/lib/search/types";
import { EMPTY_SEARCH_RESULTS, isEmptyResults } from "@/lib/search/types";

/** Long enough that typing a word doesn't fire a query per keystroke. */
const DEBOUNCE_MS = 200;

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY_SEARCH_RESULTS);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const resultsRef = useRef<HTMLDivElement>(null);

  // Every run is stamped so a slow early request can never overwrite the
  // results of a later, faster one.
  const requestRef = useRef(0);

  const normalized = normalizeSearchQuery(query);

  useEffect(() => {
    // Nothing to fetch for a closed dialog or a too-short query — the render
    // below derives the idle state instead of writing it back into state.
    if (!open || !normalized) return;

    const requestId = ++requestRef.current;
    const timer = setTimeout(() => {
      startTransition(async () => {
        const outcome = await searchEverything(normalized);
        if (requestRef.current !== requestId) return;

        if ("error" in outcome) {
          setError(outcome.error);
          setResults(EMPTY_SEARCH_RESULTS);
          return;
        }

        setError(null);
        setResults(outcome.results);
      });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [normalized, open]);

  /** Resets on close so the dialog never reopens flashing the last search. */
  function handleOpenChange(next: boolean) {
    if (!next) {
      // Invalidate any in-flight request so a late response cannot land
      // results into the freshly cleared dialog.
      requestRef.current++;
      setQuery("");
      setResults(EMPTY_SEARCH_RESULTS);
      setError(null);
    }
    onOpenChange(next);
  }

  /** Arrow keys walk the result links; the input keeps the caret otherwise. */
  function moveFocus(direction: 1 | -1, from?: HTMLElement) {
    const items = Array.from(
      resultsRef.current?.querySelectorAll<HTMLAnchorElement>(
        "a[data-result]",
      ) ?? [],
    );
    if (items.length === 0) return;

    const currentIndex = from ? items.indexOf(from as HTMLAnchorElement) : -1;
    const nextIndex = currentIndex + direction;

    if (nextIndex < 0) return;
    items[Math.min(nextIndex, items.length - 1)]?.focus();
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "ArrowDown") return;
    event.preventDefault();
    moveFocus(1);
  }

  function onResultKeyDown(event: React.KeyboardEvent<HTMLAnchorElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    moveFocus(event.key === "ArrowDown" ? 1 : -1, event.currentTarget);
  }

  // A too-short query shows the idle prompt without clearing what was fetched,
  // so backspacing to one character and typing again does not refetch.
  const visibleResults = normalized ? results : EMPTY_SEARCH_RESULTS;
  const visibleError = normalized ? error : null;
  const showEmpty =
    normalized !== null &&
    !isPending &&
    !visibleError &&
    isEmptyResults(visibleResults);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[10%] max-h-[80svh] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <DialogTitle className="sr-only">Search</DialogTitle>
        <DialogDescription className="sr-only">
          Search your habits and journal entries by name or text.
        </DialogDescription>

        <div className="border-border flex items-center gap-2 border-b px-4">
          {isPending ? (
            <Loader2
              className="text-muted-foreground size-4 shrink-0 animate-spin"
              aria-hidden="true"
            />
          ) : (
            <Search
              className="text-muted-foreground size-4 shrink-0"
              aria-hidden="true"
            />
          )}
          <Input
            autoFocus
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Search habits and journal…"
            aria-label="Search habits and journal"
            className="h-12 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>

        <div
          ref={resultsRef}
          className="overflow-y-auto p-2"
          aria-busy={isPending}
        >
          <p role="status" aria-live="polite" className="sr-only">
            {isPending
              ? "Searching"
              : normalized
                ? `${visibleResults.habits.length + visibleResults.reflections.length} results`
                : ""}
          </p>

          {visibleError ? (
            <p
              role="alert"
              className="text-destructive px-3 py-6 text-center text-sm"
            >
              {visibleError}
            </p>
          ) : null}

          {!visibleError && normalized === null ? (
            <p className="text-muted-foreground px-3 py-6 text-center text-sm">
              Type at least {MIN_QUERY_LENGTH} characters to search your habits
              and journal.
            </p>
          ) : null}

          {showEmpty ? (
            <p className="text-muted-foreground px-3 py-6 text-center text-sm">
              Nothing matches “{normalized}”.
            </p>
          ) : null}

          {visibleResults.habits.length > 0 ? (
            <section aria-labelledby="search-habits">
              <h2
                id="search-habits"
                className="font-display text-muted-foreground px-3 pt-2 pb-1 text-xs font-semibold"
              >
                Habits
              </h2>
              <ul>
                {visibleResults.habits.map((habit) => (
                  <li key={habit.id}>
                    <Link
                      data-result
                      href={`/habits/${habit.id}`}
                      onClick={() => handleOpenChange(false)}
                      onKeyDown={onResultKeyDown}
                      className="hover:bg-muted focus-visible:bg-muted focus-visible:ring-ring flex items-center gap-3 rounded-xl px-3 py-2.5 outline-none focus-visible:ring-2"
                    >
                      <HabitAvatar
                        icon={habit.icon}
                        name={habit.name}
                        color={habit.color}
                        className="size-8 shrink-0 rounded-xl"
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {habit.name}
                      </span>
                      {habit.isArchived ? (
                        <span className="text-muted-foreground border-border shrink-0 rounded-full border px-2 py-0.5 text-xs">
                          Archived
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {visibleResults.reflections.length > 0 ? (
            <section aria-labelledby="search-journal">
              <h2
                id="search-journal"
                className="font-display text-muted-foreground px-3 pt-3 pb-1 text-xs font-semibold"
              >
                Journal
              </h2>
              <ul>
                {visibleResults.reflections.map((reflection) => (
                  <li key={reflection.id}>
                    <Link
                      data-result
                      href={`/journal?date=${reflection.entryDate}`}
                      onClick={() => handleOpenChange(false)}
                      onKeyDown={onResultKeyDown}
                      className="hover:bg-muted focus-visible:bg-muted focus-visible:ring-ring flex items-start gap-3 rounded-xl px-3 py-2.5 outline-none focus-visible:ring-2"
                    >
                      <BookOpen
                        className="text-muted-foreground mt-0.5 size-4 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">
                          {formatFriendlyDate(reflection.entryDate)}
                        </span>
                        <span className="text-muted-foreground line-clamp-2 block text-sm">
                          {reflection.excerpt}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
