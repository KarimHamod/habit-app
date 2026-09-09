"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";

import {
  deleteReflection,
  saveReflection,
  type ReflectionActionState,
} from "@/actions/reflections";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatFriendlyDate } from "@/lib/dates/date-string";
import { getReflectionPrompt } from "@/lib/reflections/prompts";
import type { Reflection } from "@/lib/reflections/types";
import { REFLECTION_MAX_LENGTH } from "@/lib/reflections/validation";

const initialState: ReflectionActionState = {};

export function ReflectionEditor({
  entryDate,
  isToday,
  reflection,
}: {
  entryDate: string;
  isToday: boolean;
  reflection: Reflection | null;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    saveReflection,
    initialState,
  );
  const [body, setBody] = useState(reflection?.body ?? "");
  const [showSaved, setShowSaved] = useState(false);
  const [lastHandledState, setLastHandledState] =
    useState<ReflectionActionState>(state);
  const [isRemoving, startRemoving] = useTransition();
  const [removeError, setRemoveError] = useState<string | null>(null);

  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (state.success) setShowSaved(true);
  }

  useEffect(() => {
    if (!showSaved) return;
    // Depending on `state` restarts the timer on each new successful save,
    // matching the settings form's behaviour.
    const timer = setTimeout(() => setShowSaved(false), 3000);
    return () => clearTimeout(timer);
  }, [showSaved, state]);

  function handleRemove() {
    setRemoveError(null);
    startRemoving(async () => {
      const result = await deleteReflection(entryDate);
      if ("error" in result) {
        setRemoveError(result.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  const busy = isPending || isRemoving;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isToday ? "Today" : formatFriendlyDate(entryDate)}
        </CardTitle>
        <CardDescription>
          A private note to yourself. Entirely optional — nothing here is scored
          or counted.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-2">
          <input type="hidden" name="entryDate" value={entryDate} />
          <Label htmlFor="body">Your reflection</Label>
          <Textarea
            id="body"
            name="body"
            rows={5}
            maxLength={REFLECTION_MAX_LENGTH}
            placeholder={getReflectionPrompt(entryDate)}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          <p className="text-muted-foreground text-xs">
            {body.length} / {REFLECTION_MAX_LENGTH}
          </p>

          {state.error ? (
            <p role="alert" className="text-destructive text-sm">
              {state.error}
            </p>
          ) : null}
          {removeError ? (
            <p role="alert" className="text-destructive text-sm">
              {removeError}
            </p>
          ) : null}
          {showSaved ? (
            <p role="status" className="text-mint text-sm">
              Reflection saved.
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="mt-6 flex gap-3">
          <Button type="submit" disabled={busy || body.trim().length === 0}>
            {isPending ? "Saving…" : "Save reflection"}
          </Button>
          {reflection ? (
            <Button
              type="button"
              variant="ghost"
              onClick={handleRemove}
              disabled={busy}
            >
              {isRemoving ? "Removing…" : "Remove"}
            </Button>
          ) : null}
        </CardFooter>
      </form>
    </Card>
  );
}
