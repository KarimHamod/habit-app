"use client";

import { BookOpen, Settings, Sprout, Sun, Trophy } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SearchTrigger } from "@/components/search/search-trigger";
import { SignOutButton } from "@/components/shared/sign-out-button";
import { cn } from "@/lib/utils";

// Five primary destinations, per the Sprout & Bloom information
// architecture. /habits and /calendar are still real, deep-linkable routes —
// they sit inside the Rituals and Consistency sections respectively, reached
// through <SectionTabs>, and are listed in `matches` so the parent nav item
// still highlights while the user is on them.
const NAV_ITEMS = [
  { href: "/today", label: "Today", icon: Sun, matches: [] },
  { href: "/challenges", label: "Rituals", icon: Trophy, matches: ["/habits"] },
  {
    href: "/insights",
    label: "Consistency",
    icon: Sprout,
    matches: ["/calendar"],
  },
  { href: "/journal", label: "Journal", icon: BookOpen, matches: [] },
  { href: "/settings", label: "Settings", icon: Settings, matches: [] },
] as const satisfies readonly {
  href: string;
  label: string;
  icon: typeof Sun;
  matches: readonly string[];
}[];

function matchesPath(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

function isActive(pathname: string, href: string, matches: readonly string[]) {
  return (
    matchesPath(pathname, href) ||
    matches.some((path) => matchesPath(pathname, path))
  );
}

export function AppTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon, matches }) => {
          const active = isActive(pathname, href, matches);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="flex flex-col items-center gap-0.5 py-2.5 text-xs"
              >
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full transition-colors",
                    active
                      ? "bg-lemon text-lemon-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span
                  className={cn(
                    active
                      ? "text-primary font-semibold"
                      : "text-muted-foreground font-medium",
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AppRail() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="border-border sticky top-0 hidden h-svh w-18 shrink-0 flex-col justify-between border-r p-3 md:flex lg:w-56 lg:p-4"
    >
      <div className="flex flex-col gap-6">
        <Link
          href="/today"
          className="font-display text-primary flex h-8 items-center justify-center px-2 text-xl font-semibold lg:justify-start"
        >
          <span className="lg:hidden">H</span>
          <span className="hidden lg:inline">Habit</span>
        </Link>
        <SearchTrigger />
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon, matches }) => {
            const active = isActive(pathname, href, matches);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors lg:justify-start",
                    active
                      ? "bg-lemon text-lemon-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium",
                  )}
                >
                  <Icon className="size-5 shrink-0" aria-hidden="true" />
                  <span className="hidden lg:inline">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="flex justify-center lg:justify-start">
        <SignOutButton compact />
      </div>
    </nav>
  );
}
