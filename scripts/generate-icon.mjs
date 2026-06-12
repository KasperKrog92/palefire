// Generates app-icon.png (1024x1024): a pale flame glow over deep night water.
// Run `npx tauri icon app-icon.png` afterwards to produce src-tauri/icons/*.
import { writeFileSync } from "node:fs";
import { encodePng } from "./png.mjs";

const S = 1024;
const rgb = Buffer.alloc(S * S * 3);

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(1, Math.max(0, v));

for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    const nx = x / S;
    const ny = y / S;

    // Night gradient: near-black blue at top to deep slate at bottom
    let r = lerp(10, 24, ny);
    let g = lerp(13, 30, ny);
    let b = lerp(20, 42, ny);

    // Flame core: a soft teardrop of pale warm light, slightly above center
    const fx = nx - 0.5;
    const fy = ny - 0.46;
    // teardrop: narrower above the core, rounder below
    const stretch = fy < 0 ? 2.6 : 1.55;
    const d = Math.sqrt(fx * fx * 6.5 + fy * fy * stretch * stretch * 4.0);
    const glow = clamp01(1 - d) ** 2.6; // wide halo
    const core = clamp01(1 - d * 2.4) ** 1.7; // bright center

    r += glow * 105 + core * 150;
    g += glow * 78 + core * 124;
    b += glow * 42 + core * 86;

    // Water line shimmer: faint horizontal band of reflected light below
    const wy = ny - 0.78;
    if (wy > 0) {
      const fall = Math.exp(-wy * 11);
      const ripple = 0.55 + 0.45 * Math.sin(nx * 95 + Math.sin(nx * 31) * 2.4);
      const width = Math.exp(-Math.abs(fx) * 5.2);
      const sh = fall * ripple * width;
      r += sh * 46;
      g += sh * 36;
      b += sh * 22;
    }

    const i = (y * S + x) * 3;
    rgb[i] = Math.min(255, Math.round(r));
    rgb[i + 1] = Math.min(255, Math.round(g));
    rgb[i + 2] = Math.min(255, Math.round(b));
  }
}

writeFileSync(new URL("../app-icon.png", import.meta.url), encodePng(S, S, rgb));
console.log("wrote app-icon.png");
