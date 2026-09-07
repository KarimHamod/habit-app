import { LogOut } from "lucide-react";

import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SignOutButtonProps {
  /** Icon-only below `lg`, full text at `lg`+ — for the tablet-width app rail. */
  compact?: boolean;
}

export function SignOutButton({ compact = false }: SignOutButtonProps) {
  return (
    <form action={signOut}>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        aria-label={compact ? "Sign out" : undefined}
      >
        <LogOut
          className={cn("size-4", compact ? "lg:hidden" : "hidden")}
          aria-hidden="true"
        />
        <span className={compact ? "hidden lg:inline" : undefined}>
          Sign out
        </span>
      </Button>
    </form>
  );
}
