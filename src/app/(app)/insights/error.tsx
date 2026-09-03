"use client";

import { Button } from "@/components/ui/button";

export default function InsightsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-3 p-10 text-center">
      <p className="font-medium">Couldn&apos;t load your insights.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
