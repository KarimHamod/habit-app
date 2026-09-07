import { redirect } from "next/navigation";

import { SettingsForm } from "@/components/settings/settings-form";
import { SignOutButton } from "@/components/shared/sign-out-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getAuthenticatedUser,
  getCurrentProfile,
} from "@/lib/supabase/session";

export default async function SettingsPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    throw new Error("Profile not found");
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-4 pb-24">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <SettingsForm profile={profile} />
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-sm">Email</span>
            <span className="text-sm">{user.email}</span>
          </div>
          <SignOutButton />
        </CardContent>
      </Card>
    </div>
  );
}
