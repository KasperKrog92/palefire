/**
 * Deterministic fallback art for items without an image: a quiet two-tone
 * night-sea gradient with a low light on the horizon, seeded by title.
 */
export function fallbackCover(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;

  const hue = 195 + (h % 50); // cold blues into teal
  const warm = 25 + ((h >> 4) % 18); // ember horizon
  const x = 30 + ((h >> 8) % 40);

  return [
    `radial-gradient(ellipse 90% 55% at ${x}% 96%, hsla(${warm}, 58%, 46%, 0.34), transparent 60%)`,
    `radial-gradient(ellipse 140% 80% at 50% -10%, hsla(${hue}, 32%, 24%, 0.85), transparent 70%)`,
    `linear-gradient(180deg, hsl(${hue + 6}, 26%, 11%) 0%, hsl(${hue}, 30%, 15%) 58%, hsl(${warm + 6}, 22%, 13%) 100%)`,
  ].join(", ");
}
