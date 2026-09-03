import { redirect } from "next/navigation";

import { AppRail, AppTabBar } from "@/components/nav/app-nav";
import { SignOutButton } from "@/components/shared/sign-out-button";
import {
  getAuthenticatedUser,
  getCurrentProfile,
} from "@/lib/supabase/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getCurrentProfile();

  if (!profile?.display_name) {
    redirect("/onboarding");
  }

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <AppRail />
      <div className="flex min-h-svh flex-1 flex-col">
        <header className="border-border flex items-center justify-between border-b px-4 py-3 md:hidden">
          <span className="font-display text-primary text-lg font-semibold">
            Habit
          </span>
          <SignOutButton />
        </header>
        <main className="flex-1">{children}</main>
      </div>
      <AppTabBar />
    </div>
  );
}
