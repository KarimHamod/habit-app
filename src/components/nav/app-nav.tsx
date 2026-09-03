"use client";

import { BarChart3, CalendarDays, ListChecks, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SignOutButton } from "@/components/shared/sign-out-button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/today", label: "Today", icon: Sun },
  { href: "/habits", label: "Habits", icon: ListChecks },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/insights", label: "Insights", icon: BarChart3 },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
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
                      ? "bg-primary/12 text-primary"
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
      className="border-border sticky top-0 hidden h-svh w-56 shrink-0 flex-col justify-between border-r p-4 md:flex"
    >
      <div className="flex flex-col gap-6">
        <Link
          href="/today"
          className="font-display text-primary px-2 text-xl font-semibold"
        >
          Habit
        </Link>
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium",
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <SignOutButton />
    </nav>
  );
}
