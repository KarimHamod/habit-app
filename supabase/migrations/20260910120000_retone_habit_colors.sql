-- Retone habit accent colors for the "Sunny Citrus" design system.
--
-- The pre-Citrus swatches were raw Tailwind primary-500 hues (violet, blue,
-- cyan, ...) chosen against the old forest-green palette. On the warm cream
-- surfaces they now read as cold and out of family. Each is remapped to its
-- closest warm counterpart by hue, so a habit keeps roughly the color its
-- owner picked rather than being reassigned arbitrarily.
--
-- The mapping is mirrored in src/lib/habits/palette.ts
-- (LEGACY_COLOR_REPLACEMENTS) — keep the two in step.
--
-- Only exact legacy values are touched: habits with a custom or already-current
-- color are left alone, and re-running this is a no-op.

update public.habits
set color = case lower(color)
  when '#8b5cf6' then '#7c5295' -- violet -> plum
  when '#3b82f6' then '#2a8a7a' -- blue   -> teal
  when '#06b6d4' then '#2a8a7a' -- cyan   -> teal
  when '#22c55e' then '#2e8b57' -- green  -> fern
  when '#f97316' then '#c65f1c' -- orange -> ember
  when '#ef4444' then '#b8442f' -- red    -> clay
  when '#ec4899' then '#bf5480' -- pink   -> rose
  when '#64748b' then '#7a6a55' -- slate  -> taupe
  else color
end
where lower(color) in (
  '#8b5cf6',
  '#3b82f6',
  '#06b6d4',
  '#22c55e',
  '#f97316',
  '#ef4444',
  '#ec4899',
  '#64748b'
);
