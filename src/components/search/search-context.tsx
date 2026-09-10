"use client";

import { createContext, useContext } from "react";

interface SearchContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const SearchContext = createContext<SearchContextValue | null>(null);

/**
 * Shared open/close state for global search. The provider lives high in the
 * app shell so the desktop rail and the mobile header drive one dialog and one
 * ⌘K listener between them, rather than each mounting its own copy.
 */
export function useSearch(): SearchContextValue {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearch must be used inside <SearchProvider>");
  }
  return context;
}
