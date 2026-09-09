import Link from "next/link";

import { formatFriendlyDate } from "@/lib/dates/date-string";
import type { Reflection } from "@/lib/reflections/types";

export function ReflectionList({
  reflections,
  selectedDate,
}: {
  reflections: Reflection[];
  selectedDate: string;
}) {
  if (reflections.length === 0) return null;

  return (
    <section aria-labelledby="past-reflections" className="flex flex-col gap-3">
      <h2
        id="past-reflections"
        className="font-display text-muted-foreground text-sm font-semibold"
      >
        Earlier reflections
      </h2>
      <ul className="flex flex-col divide-y rounded-xl border">
        {reflections.map((reflection) => {
          const isSelected = reflection.entryDate === selectedDate;
          return (
            <li key={reflection.id}>
              <Link
                href={`/journal?date=${reflection.entryDate}`}
                aria-current={isSelected ? "page" : undefined}
                className="hover:bg-muted/50 flex flex-col gap-1 px-4 py-3 transition-colors"
              >
                <span className="text-sm font-medium">
                  {formatFriendlyDate(reflection.entryDate)}
                </span>
                <span className="text-muted-foreground line-clamp-2 text-sm">
                  {reflection.body}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
