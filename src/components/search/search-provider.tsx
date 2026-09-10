"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { SearchContext } from "./search-context";
import { SearchDialog } from "./search-dialog";

/**
 * Owns global search for the whole app shell: one dialog, one keyboard
 * shortcut, and the open state both triggers (rail and mobile header) share.
 */
export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "k" || !(event.metaKey || event.ctrlKey)) return;
      // Only claim the chord once we know we're handling it, so ⌘K stays
      // available to the browser everywhere else.
      event.preventDefault();
      setOpen((previous) => !previous);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleOpenChange = useCallback((next: boolean) => setOpen(next), []);
  const value = useMemo(
    () => ({ open, setOpen: handleOpenChange }),
    [open, handleOpenChange],
  );

  return (
    <SearchContext.Provider value={value}>
      {children}
      <SearchDialog open={open} onOpenChange={handleOpenChange} />
    </SearchContext.Provider>
  );
}
