"use client";

import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

import { useSearch } from "./search-context";

/**
 * Opens global search. Rendered twice — once in the desktop rail, once in the
 * mobile header — but both drive the single dialog owned by <SearchProvider>.
 *
 * `compact` is the icon-only form for the mobile header; the rail form widens
 * into a labelled affordance at lg, where the rail shows labels.
 */
export function SearchTrigger({ compact = false }: { compact?: boolean }) {
  const { setOpen } = useSearch();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Search habits and journal"
      aria-keyshortcuts="Meta+K Control+K"
      className={cn(
        "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex items-center rounded-xl transition-colors outline-none focus-visible:ring-2",
        compact
          ? "size-9 justify-center"
          : "justify-center gap-3 px-3 py-2.5 text-sm font-medium lg:w-full lg:justify-start",
      )}
    >
      <Search className="size-5 shrink-0" aria-hidden="true" />
      {compact ? null : (
        <>
          <span className="hidden lg:inline">Search</span>
          <kbd className="border-border text-muted-foreground ml-auto hidden rounded-md border px-1.5 py-0.5 font-sans text-[0.6875rem] lg:inline">
            ⌘K
          </kbd>
        </>
      )}
    </button>
  );
}
