import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Reflection } from "@/lib/reflections/types";

/**
 * Side-rail widget on the Today page: today's reflection, or a quiet
 * invitation to write one. Deliberately carries no count, badge, or streak —
 * it should read as available, never as owed.
 */
export function ReflectionCard({
  reflection,
}: {
  reflection: Reflection | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reflection</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-3">
        {reflection ? (
          <>
            <p className="text-muted-foreground line-clamp-3 text-sm">
              {reflection.body}
            </p>
            <Link
              href="/journal"
              className="text-primary text-sm font-medium underline-offset-4 hover:underline"
            >
              Edit today&apos;s reflection
            </Link>
          </>
        ) : (
          <>
            <p className="text-muted-foreground text-sm">
              Nothing written today. Whenever you feel like it.
            </p>
            <Link
              href="/journal"
              className="text-primary text-sm font-medium underline-offset-4 hover:underline"
            >
              Add a reflection
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
