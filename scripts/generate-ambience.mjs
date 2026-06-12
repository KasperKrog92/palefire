// Synthesizes the built-in ambience loops into public/audio/.
// Pure procedural audio — no samples, no network. Each loop is rendered with a
// pre-roll crossfade so it wraps seamlessly.
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const GEN_VERSION = "3";
const SR = 44100;
const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "audio");
const VERSION_FILE = path.join(OUT_DIR, ".gen-version");

const FILES = [
  "engine-hum.wav",
  "north-sea-swell.wav",
  "rain-on-steel.wav",
  "cabin-drone.wav",
  "radio-static.wav",
  "dock-wind.wav",
];

if (
  existsSync(VERSION_FILE) &&
  readFileSync(VERSION_FILE, "utf8").trim() === GEN_VERSION &&
  FILES.every((f) => existsSync(path.join(OUT_DIR, f)))
) {
  console.log("ambience: up to date");
  process.exit(0);
}

mkdirSync(OUT_DIR, { recursive: true });

// Deterministic PRNG so the loops are reproducible builds.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// One-pole lowpass coefficient for cutoff in Hz.
const lpCoef = (fc) => 1 - Math.exp((-2 * Math.PI * fc) / SR);

/**
 * Render `seconds` of audio with `fn(i, n)` (sample index in the full render),
 * then fold the pre-roll into the tail so the loop wraps without a click.
 */
function renderLoop(seconds, fadeSeconds, fn) {
  const N = Math.floor(seconds * SR);
  const F = Math.floor(fadeSeconds * SR);
  const R = new Float64Array(N + F);
  fn(R);
  const out = new Float64Array(N);
  for (let i = 0; i < N - F; i++) out[i] = R[F + i];
  for (let j = 0; j < F; j++) {
    const t = j / F;
    out[N - F + j] = R[N + j] * (1 - t) + R[j] * t;
  }
  return out;
}

function writeWav(name, samples, peak = 0.72) {
  let max = 1e-9;
  for (const s of samples) max = Math.max(max, Math.abs(s));
  const scale = peak / max;
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write("WAVEfmt ", 8, "ascii");
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36, "ascii");
  buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * scale * 32767))), 44 + i * 2);
  }
  writeFileSync(path.join(OUT_DIR, name), buf);
  console.log(`ambience: wrote ${name} (${(buf.length / 1024 / 1024).toFixed(1)} MB)`);
}

// --- 1. Engine hum: deep brown noise + slow throb, like a hull two decks up.
{
  const rand = mulberry32(101);
  writeWav(
    "engine-hum.wav",
    renderLoop(32, 2, (R) => {
      let brown = 0;
      let lp = 0;
      const a = lpCoef(140);
      for (let i = 0; i < R.length; i++) {
        brown += (rand() * 2 - 1) * 0.02;
        brown *= 0.998;
        lp += a * (brown * 6 - lp);
        const t = i / SR;
        const throb = 0.78 + 0.22 * Math.sin(2 * Math.PI * 0.23 * t);
        const sub = 0.32 * Math.sin(2 * Math.PI * 47 * t) + 0.14 * Math.sin(2 * Math.PI * 94 * t + 1.3);
        R[i] = (lp * 1.45 + sub) * throb;
      }
    })
  );
}

// --- 2. North sea swell: long overlapping waves of band-limited noise.
{
  const rand = mulberry32(202);
  writeWav(
    "north-sea-swell.wav",
    renderLoop(40, 3, (R) => {
      let lp1 = 0;
      let lp2 = 0;
      const a1 = lpCoef(900);
      const a2 = lpCoef(220);
      for (let i = 0; i < R.length; i++) {
        const w = rand() * 2 - 1;
        lp1 += a1 * (w - lp1);
        lp2 += a2 * (lp1 - lp2);
        const t = i / SR;
        const wave =
          0.45 + 0.3 * Math.sin(2 * Math.PI * 0.085 * t) + 0.25 * Math.sin(2 * Math.PI * 0.053 * t + 2.1);
        const surf = lp1 - lp2; // mid "wash"
        R[i] = (lp2 * 2.2 + surf * 1.1 * wave) * wave;
      }
    })
  );
}

// --- 3. Rain on steel: hiss + irregular metallic ticks on the deck plating.
{
  const rand = mulberry32(303);
  writeWav(
    "rain-on-steel.wav",
    renderLoop(30, 2, (R) => {
      let hp = 0;
      let lp = 0;
      const a = lpCoef(3800);
      for (let i = 0; i < R.length; i++) {
        const w = rand() * 2 - 1;
        lp += a * (w - lp);
        const hiss = (w - lp) * 0.5; // high-passed
        hp = hiss + lp * 0.18;
        const t = i / SR;
        const swellEnv = 0.8 + 0.2 * Math.sin(2 * Math.PI * 0.11 * t + 0.7);
        R[i] += hp * 0.55 * swellEnv;
      }
      // metallic droplets: short ringing pings, denser in gust phases
      const pings = Math.floor(R.length / SR) * 26;
      for (let p = 0; p < pings; p++) {
        const start = Math.floor(rand() * (R.length - SR * 0.3));
        const freq = 1400 + rand() * 4200;
        const amp = 0.05 + rand() * 0.16;
        const decay = 60 + rand() * 240;
        const len = Math.floor(SR * 0.12);
        for (let j = 0; j < len; j++) {
          const tt = j / SR;
          R[start + j] += amp * Math.sin(2 * Math.PI * freq * tt) * Math.exp(-tt * decay);
        }
      }
    })
  );
}

// --- 4. Cabin drone: warm detuned cluster, barely moving. The sound of 3 a.m.
{
  writeWav(
    "cabin-drone.wav",
    renderLoop(36, 4, (R) => {
      const partials = [
        [55.0, 0.5],
        [55.35, 0.42],
        [82.6, 0.2],
        [110.4, 0.16],
        [165.2, 0.07],
        [220.7, 0.045],
      ];
      for (let i = 0; i < R.length; i++) {
        const t = i / SR;
        const breath = 0.72 + 0.28 * Math.sin(2 * Math.PI * 0.045 * t);
        let s = 0;
        for (const [f, g] of partials) s += g * Math.sin(2 * Math.PI * f * t);
        R[i] = s * breath;
      }
    }),
    0.6
  );
}

// --- 5. Radio static: a receiver left on between stations.
{
  const rand = mulberry32(505);
  writeWav(
    "radio-static.wav",
    renderLoop(26, 2, (R) => {
      let lp = 0;
      const a = lpCoef(2600);
      for (let i = 0; i < R.length; i++) {
        const w = rand() * 2 - 1;
        lp += a * (w - lp);
        const t = i / SR;
        const drift = 0.6 + 0.4 * Math.sin(2 * Math.PI * 0.07 * t + Math.sin(2 * Math.PI * 0.013 * t) * 3);
        const hum = 0.05 * Math.sin(2 * Math.PI * 100 * t);
        R[i] = lp * 0.5 * drift + hum;
      }
      // crackle pops
      const pops = Math.floor(R.length / SR) * 9;
      for (let p = 0; p < pops; p++) {
        const start = Math.floor(rand() * (R.length - SR * 0.1));
        const amp = (0.2 + rand() * 0.5) * (rand() < 0.5 ? -1 : 1);
        const len = 30 + Math.floor(rand() * 220);
        for (let j = 0; j < len; j++) {
          R[start + j] += amp * Math.exp(-j / (len * 0.25)) * (rand() * 2 - 1);
        }
      }
    }),
    0.55
  );
}

// --- 6. Dock wind: gusts over mooring lines and open water.
{
  const rand = mulberry32(606);
  writeWav(
    "dock-wind.wav",
    renderLoop(40, 3, (R) => {
      let lp = 0;
      let rumble = 0;
      const ar = lpCoef(70);
      for (let i = 0; i < R.length; i++) {
        const w = rand() * 2 - 1;
        const t = i / SR;
        const gust =
          0.5 +
          0.28 * Math.sin(2 * Math.PI * 0.06 * t + 1.1) +
          0.22 * Math.sin(2 * Math.PI * 0.149 * t + Math.sin(2 * Math.PI * 0.021 * t) * 2.2);
        const cutoff = 300 + 1500 * gust * gust;
        lp += lpCoef(cutoff) * (w - lp);
        rumble += ar * (w * 0.8 - rumble);
        R[i] = lp * (0.35 + 0.85 * gust) + rumble * 1.6;
      }
    })
  );
}

writeFileSync(VERSION_FILE, GEN_VERSION);
console.log("ambience: done");
