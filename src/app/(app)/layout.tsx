import { redirect } from "next/navigation";

import { AppRail, AppTabBar } from "@/components/nav/app-nav";
import { SearchProvider } from "@/components/search/search-provider";
import { SearchTrigger } from "@/components/search/search-trigger";
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
    <SearchProvider>
      <div className="flex min-h-svh flex-col md:flex-row">
        <a
          href="#main-content"
          className="bg-primary text-primary-foreground focus-visible:ring-ring sr-only rounded-lg px-4 py-2 text-sm font-medium outline-none focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:left-3 focus-visible:z-50 focus-visible:ring-2"
        >
          Skip to content
        </a>
        <AppRail />
        <div className="flex min-h-svh flex-1 flex-col">
          <header className="border-border flex items-center justify-between border-b px-4 py-3 md:hidden">
            <span className="font-display text-primary text-lg font-semibold">
              Habit
            </span>
            <div className="flex items-center gap-1">
              <SearchTrigger compact />
              <SignOutButton />
            </div>
          </header>
          <main
            id="main-content"
            className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0"
          >
            {children}
          </main>
        </div>
        <AppTabBar />
      </div>
    </SearchProvider>
  );
}
