import { getAccentForegroundColor } from "@/lib/habits/color";
import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  sm: "size-10 text-sm",
  md: "size-11 text-sm",
  lg: "size-12 text-lg",
} as const;

interface HabitAvatarProps {
  icon: string | null;
  name: string;
  color: string | null;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

/** Colored circle showing a habit's emoji icon, or its initial letter when none is set. */
export function HabitAvatar({
  icon,
  name,
  color,
  size = "md",
  className,
}: HabitAvatarProps) {
  const accent = color ?? "var(--color-muted-foreground)";

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        SIZE_CLASSES[size],
        className,
      )}
      style={{
        backgroundColor: accent,
        color: color ? getAccentForegroundColor(color) : "#ffffff",
      }}
      aria-hidden="true"
    >
      {icon ?? name.charAt(0).toUpperCase()}
    </div>
  );
}
