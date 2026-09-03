import { redirect } from "next/navigation";

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
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-semibold">Habit</span>
        <SignOutButton />
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
