"use client";

import { useActionState, useEffect, useMemo, useState } from "react";

import { updateProfile, type ProfileActionState } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Database } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const initialState: ProfileActionState = {};

const WEEKDAYS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
];

const WEEKDAY_ITEMS = Object.fromEntries(
  WEEKDAYS.map((day) => [day.value, day.label]),
);

export function SettingsForm({ profile }: { profile: Profile }) {
  const [state, formAction, isPending] = useActionState(
    updateProfile,
    initialState,
  );
  const [showSaved, setShowSaved] = useState(false);
  const [lastHandledState, setLastHandledState] =
    useState<ProfileActionState>(state);

  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (state.success) setShowSaved(true);
  }

  const timezones = useMemo(() => {
    if (typeof Intl.supportedValuesOf === "function") {
      return Intl.supportedValuesOf("timeZone");
    }
    return ["UTC"];
  }, []);

  const timezoneItems = useMemo(
    () => Object.fromEntries(timezones.map((tz) => [tz, tz])),
    [timezones],
  );

  useEffect(() => {
    if (!showSaved) return;
    // Depending on `state` (not just `showSaved`) restarts this timer on
    // every new successful save, so a second save within the 3s window
    // doesn't get cut short by the first save's timer.
    const timer = setTimeout(() => setShowSaved(false), 3000);
    return () => clearTimeout(timer);
  }, [showSaved, state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          These settings affect how your habit days are calculated.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="displayName">Your name</Label>
            <Input
              id="displayName"
              name="displayName"
              autoComplete="name"
              defaultValue={profile.display_name ?? ""}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              name="timezone"
              defaultValue={profile.timezone}
              items={timezoneItems}
            >
              <SelectTrigger id="timezone" className="w-full">
                <SelectValue placeholder="Select a timezone" />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="weekStartsOn">Week starts on</Label>
            <Select
              name="weekStartsOn"
              defaultValue={String(profile.week_starts_on)}
              items={WEEKDAY_ITEMS}
            >
              <SelectTrigger id="weekStartsOn" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEKDAYS.map((day) => (
                  <SelectItem key={day.value} value={day.value}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {state.error ? (
            <p role="alert" className="text-destructive text-sm">
              {state.error}
            </p>
          ) : null}
          {showSaved ? (
            <p role="status" className="text-mint text-sm">
              Settings saved.
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="mt-6">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Saving…" : "Save changes"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
