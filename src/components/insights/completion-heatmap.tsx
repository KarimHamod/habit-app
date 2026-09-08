import { getDayOfWeek } from "@/lib/dates/date-string";
import type { DailyFlowPoint } from "@/lib/insights/aggregate";
import { cn } from "@/lib/utils";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface HeatmapCell {
  point: DailyFlowPoint | null;
}

/** Splits a chronological run of days into GitHub-style week columns, padding the first column so every column has exactly 7 rows aligned to weekStartsOn. */
function buildWeekColumns(
  points: DailyFlowPoint[],
  weekStartsOn: 0 | 1,
): HeatmapCell[][] {
  if (points.length === 0) return [];

  const leadingBlanks =
    (getDayOfWeek(points[0].date) - weekStartsOn + 7) % 7;
  const cells: HeatmapCell[] = [
    ...Array.from({ length: leadingBlanks }, () => ({ point: null })),
    ...points.map((point) => ({ point })),
  ];

  const columns: HeatmapCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    columns.push(cells.slice(i, i + 7));
  }
  return columns;
}

function levelFor(point: DailyFlowPoint | null): 0 | 1 | 2 | 3 {
  if (!point || point.scheduled === 0 || point.completed === 0) return 0;
  const rate = point.completed / point.scheduled;
  if (rate >= 1) return 3;
  if (rate >= 0.5) return 2;
  return 1;
}

const LEVEL_CLASSES: Record<0 | 1 | 2 | 3, string> = {
  0: "bg-muted",
  1: "bg-primary/30",
  2: "bg-primary/60",
  3: "bg-primary",
};

function formatCellDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

interface CompletionHeatmapProps {
  points: DailyFlowPoint[];
  weekStartsOn: 0 | 1;
}

export function CompletionHeatmap({
  points,
  weekStartsOn,
}: CompletionHeatmapProps) {
  const hasAnyData = points.some((p) => p.completed > 0);
  const columns = buildWeekColumns(points, weekStartsOn);

  const totalScheduled = points.reduce((sum, p) => sum + p.scheduled, 0);
  const totalCompleted = points.reduce((sum, p) => sum + p.completed, 0);
  const averageDensity =
    totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;

  return (
    <div className="rounded-xl border p-4">
      <p className="mb-3 text-sm font-medium">Completion heatmap</p>
      {!hasAnyData ? (
        <p className="text-muted-foreground text-sm">
          No completions yet in the last year — this fills in as you log
          habits.
        </p>
      ) : (
        <>
          <p className="sr-only">
            Average completion density over the last {points.length} days:{" "}
            {averageDensity}%.
          </p>
          <div className="overflow-x-auto pb-1">
            <div aria-hidden="true" className="inline-flex gap-2">
              <div className="flex flex-col gap-1 pt-4">
                {DAY_LETTERS.map((letter, i) => (
                  <span
                    key={i}
                    className="text-muted-foreground flex h-2.5 items-center text-[9px] leading-none"
                  >
                    {i % 2 === 1 ? letter : ""}
                  </span>
                ))}
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex gap-1">
                  {columns.map((column, i) => {
                    const firstReal = column.find((c) => c.point)?.point;
                    const prevFirstReal = columns[i - 1]
                      ?.find((c) => c.point)
                      ?.point;
                    const showLabel =
                      firstReal &&
                      (!prevFirstReal ||
                        firstReal.date.slice(0, 7) !==
                          prevFirstReal.date.slice(0, 7));
                    const month = firstReal
                      ? MONTH_LABELS[Number(firstReal.date.slice(5, 7)) - 1]
                      : "";
                    return (
                      <span
                        key={i}
                        className="text-muted-foreground w-2.5 text-[9px] leading-none"
                      >
                        {showLabel ? month : ""}
                      </span>
                    );
                  })}
                </div>
                <div className="flex gap-1">
                  {columns.map((column, i) => (
                    <div key={i} className="flex flex-col gap-1">
                      {column.map((cell, j) => (
                        <div
                          key={j}
                          title={
                            cell.point
                              ? `${formatCellDate(cell.point.date)}: ${cell.point.completed}/${cell.point.scheduled} completed`
                              : undefined
                          }
                          className={cn(
                            "size-2.5 rounded-sm",
                            cell.point ? LEVEL_CLASSES[levelFor(cell.point)] : "",
                          )}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
