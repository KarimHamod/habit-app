"use client";

import { useActionState } from "react";

import { createChallenge, type ChallengeActionState } from "@/actions/challenges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ChallengeFormProps {
  habits: { id: string; name: string }[];
}

const initialState: ChallengeActionState = {};

export function ChallengeForm({ habits }: ChallengeFormProps) {
  const [state, formAction, pending] = useActionState(
    createChallenge,
    initialState,
  );

  return (
    <form action={formAction}>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required maxLength={80} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="durationDays">Duration (days)</Label>
            <Input
              id="durationDays"
              name="durationDays"
              type="number"
              min={1}
              max={365}
              defaultValue={30}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Habits</Label>
            {habits.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Create a habit first before starting a challenge.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {habits.map((habit) => (
                  <li
                    key={habit.id}
                    className="flex items-center gap-2 rounded-xl border p-3"
                  >
                    <Checkbox
                      id={`habit-${habit.id}`}
                      name="habitIds"
                      value={habit.id}
                    />
                    <Label htmlFor={`habit-${habit.id}`}>{habit.name}</Label>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {state.error ? (
            <p role="alert" className="text-destructive text-sm">
              {state.error}
            </p>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending || habits.length === 0}>
            {pending ? "Starting…" : "Start challenge"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
