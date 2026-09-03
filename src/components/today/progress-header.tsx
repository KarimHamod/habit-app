const RING_RADIUS = 34;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface ProgressHeaderProps {
  completed: number;
  total: number;
}

function ProgressRing({ percent }: { percent: number }) {
  const offset =
    RING_CIRCUMFERENCE - (percent / 100) * RING_CIRCUMFERENCE;

  return (
    <svg viewBox="0 0 80 80" className="size-20 -rotate-90" aria-hidden="true">
      <circle
        cx="40"
        cy="40"
        r={RING_RADIUS}
        strokeWidth="8"
        className="stroke-muted fill-none"
      />
      <circle
        cx="40"
        cy="40"
        r={RING_RADIUS}
        strokeWidth="8"
        strokeLinecap="round"
        className="stroke-primary fill-none transition-[stroke-dashoffset] duration-500 ease-out"
        style={{
          strokeDasharray: RING_CIRCUMFERENCE,
          strokeDashoffset: offset,
        }}
      />
    </svg>
  );
}

export function ProgressHeader({ completed, total }: ProgressHeaderProps) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const remaining = total - completed;
  const status =
    remaining <= 0
      ? "Everything's done for today"
      : remaining === 1
        ? "1 habit left today"
        : `${remaining} habits left today`;

  return (
    <div className="border-border bg-card flex items-center gap-4 rounded-3xl border p-5">
      <div className="relative flex size-20 shrink-0 items-center justify-center">
        <ProgressRing percent={percent} />
        <span className="font-display absolute text-base font-semibold tabular-nums">
          {percent}%
        </span>
      </div>
      <div className="min-w-0">
        <p
          className="font-display text-2xl font-semibold tabular-nums"
          aria-label={`${completed} of ${total} habits completed today`}
        >
          {completed}
          <span className="text-muted-foreground text-base font-normal">
            {" "}
            of {total}
          </span>
        </p>
        <p className="text-muted-foreground text-sm">{status}</p>
      </div>
    </div>
  );
}
