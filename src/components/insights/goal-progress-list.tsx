import { Progress } from "@/components/ui/progress";
import type { GoalProgressDisplay } from "@/lib/insights/data";

interface GoalProgressListProps {
  goals: GoalProgressDisplay[];
}

export function GoalProgressList({ goals }: GoalProgressListProps) {
  return (
    <div className="rounded-xl border">
      <p className="border-b p-4 text-sm font-medium">Goals</p>
      {goals.length === 0 ? (
        <p className="text-muted-foreground p-4 text-sm">
          No active goals right now.
        </p>
      ) : (
        <ul className="flex flex-col gap-3 p-4">
          {goals.map((goal) => (
            <li key={goal.id}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span>{goal.habitName}</span>
                <span className="text-muted-foreground">
                  {goal.current} / {goal.target}
                </span>
              </div>
              <Progress
                value={goal.progress}
                aria-label={`${goal.habitName} goal progress`}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
