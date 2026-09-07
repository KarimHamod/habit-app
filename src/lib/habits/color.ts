const WHITE = "#ffffff";
const NEAR_BLACK = "#111114";

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const value = match[1];
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function channelLuminance(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 1; // unparseable input treated as light, so text falls back to dark
  return (
    0.2126 * channelLuminance(rgb.r) +
    0.7152 * channelLuminance(rgb.g) +
    0.0722 * channelLuminance(rgb.b)
  );
}

/**
 * Habit accent colors are freeform (user-picked from a preset palette today,
 * arbitrary hex potentially later) and get white lettering drawn on top for
 * avatars. Several presets — e.g. #06b6d4, #22c55e — fall well under 4.5:1
 * against white. Picking whichever of white/near-black has higher contrast
 * against the accent always clears (or comes within a hair of) WCAG AA,
 * since the two options' contrast ratios cross at ~4.58:1.
 */
export function getAccentForegroundColor(
  hex: string | null | undefined,
): string {
  if (!hex) return WHITE;
  const luminance = relativeLuminance(hex);
  const contrastWithWhite = 1.05 / (luminance + 0.05);
  const contrastWithBlack = (luminance + 0.05) / 0.05;
  return contrastWithWhite >= contrastWithBlack ? WHITE : NEAR_BLACK;
}
