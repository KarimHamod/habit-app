"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * A segmented switch between two sibling routes inside one primary nav
 * section (Challenges/My habits, Insights/Calendar).
 *
 * Real <Link>s rather than the Tabs primitive: these are separate server-
 * rendered routes, so links keep deep-linking, back/forward, and prefetching
 * working. The active item is marked with aria-current, not colour alone.
 */
export function SectionTabs({
  items,
}: {
  items: readonly { href: string; label: string }[];
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Section">
      <ul className="bg-muted/60 flex w-fit items-center gap-1 rounded-full p-1">
        {items.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-full px-4 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-background text-primary font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground font-medium",
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
