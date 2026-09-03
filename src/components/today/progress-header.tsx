import { Progress } from "@/components/ui/progress";

interface ProgressHeaderProps {
  completed: number;
  total: number;
}

export function ProgressHeader({ completed, total }: ProgressHeaderProps) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div>
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        Today
      </p>
      <div className="mt-1 flex items-baseline justify-between">
        <p className="text-2xl font-bold">
          {completed} / {total} completed
        </p>
        <p className="text-muted-foreground text-sm">{percent}%</p>
      </div>
      <Progress
        value={percent}
        className="mt-3"
        aria-label={`${completed} of ${total} habits completed today`}
      />
    </div>
  );
}
