"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const noopSubscribe = () => () => {};

/** True only after the client has mounted — false during SSR/first paint, without a setState-in-effect. */
function useHasMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/** Settings card: light/dark appearance toggle, backed by next-themes (persisted client-side). */
export function ThemeToggleCard() {
  const { resolvedTheme, setTheme } = useTheme();
  // useTheme() has no value until after mount — guard against briefly
  // rendering the switch in the wrong position during hydration.
  const mounted = useHasMounted();
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-xl border p-4">
          <div>
            <Label htmlFor="dark-mode">Dark mode</Label>
            <p className="text-muted-foreground text-sm">
              Switch between light and dark appearance.
            </p>
          </div>
          <Switch
            id="dark-mode"
            checked={isDark}
            disabled={!mounted}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          />
        </div>
      </CardContent>
    </Card>
  );
}
