// The buzz: blood alcohol, modeled on the research (docs/research/
// substances.md, section 1). A drink is absorbed over 30-60 minutes, faster
// for a fizzy cocktail than a neat shot, slower and lower on a full stomach;
// the liver then clears a steady ~0.015% an hour whatever you do (water and
// coffee don't speed it); a night that went past about 0.08% leaves a
// hangover once it clears. Pure functions over a `Bar` the client keeps; the
// meter the rest of the game reads is `buzzLevel` (BAC / 0.25, where 0.25 is
// needing help to walk).

import {
  bodyOf,
  gameSeconds,
  strongest,
  type Body,
  type Meters,
} from "./substances.ts";

const clamp01 = (x: number) =>
  Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0;

/** The blood alcohol the meter reads 1 at: needing help to walk. */
export const BAC_FULL = 0.25;

/** Real seconds per play second for alcohol. Its clock runs linear, since
 * the liver clears a steady amount an hour, matched to the shared substance
 * curve at a drink's usual 90 minutes (about 18x). */
export const ALCOHOL_SCALE = (90 * 60) / gameSeconds(90);

/** Real minutes as play seconds on alcohol's clock. */
const play = (minutes: number) => (minutes * 60) / ALCOHOL_SCALE;

/** What one drink adds to an average adult's BAC, and the real minutes it
 * takes to absorb. A beer and a shot are each one US standard drink (14 g);
 * a cocktail is about one and a half. Diluted drinks absorb faster than neat
 * spirits, and a fizzy mixer faster still (Roberts & Robinson 2007). */
const DRINKS = {
  beer: { bac: 0.025, minutes: 45 },
  cocktail: { bac: 0.035, minutes: 35 },
  shot: { bac: 0.025, minutes: 50 },
} as const;
export type Drink = keyof typeof DRINKS;

/** Elimination, BAC per play second: 0.015% a real hour. */
const CLEAR_PER_SECOND = (0.015 / 3600) * ALCOHOL_SCALE;

/** Food lasts this long in the stomach (real minutes), and while it does a
 * drink absorbs this much slower and reaches only this share of its peak. */
const FED_MINUTES = 60;
const FED_SLOWER = 1.6;
const FED_SHARE = 0.8;

/** A hangover follows a night past this BAC, and lasts this long (real
 * minutes; the research gives up to 20-24 h, most of it mild). */
const HANGOVER_FROM = 0.08;
export const HANGOVER_SECONDS = gameSeconds(12 * 60);
/** A glass of water eases the thirst and headache by this much. */
const WATER_EASES = 0.25;

/** The drinking state the client keeps. */
export type Bar = {
  /** Blood alcohol now, as a fraction (0.08 is the US driving limit). */
  bac: number;
  /** Drinks still absorbing: BAC left to add, and how fast. */
  absorbing: { left: number; perSecond: number }[];
  /** Play seconds of food left in the stomach. */
  fed: number;
  /** The highest BAC since she was last sober. */
  peak: number;
  /** How bad the hangover is, 0..1, easing over HANGOVER_SECONDS. */
  hangover: number;
};

export const soberBar = (): Bar => ({
  bac: 0,
  absorbing: [],
  fed: 0,
  peak: 0,
  hangover: 0,
});

/** A drink goes down: it starts absorbing, slower and lower when she's eaten. */
export function drinkUp(bar: Bar, drink: Drink): void {
  const d = DRINKS[drink];
  const fed = bar.fed > 0;
  const left = d.bac * (fed ? FED_SHARE : 1);
  bar.absorbing.push({
    left,
    perSecond: left / play(d.minutes * (fed ? FED_SLOWER : 1)),
  });
}

/** Food: the next hour's drinks absorb slower. It doesn't lower the BAC. */
export function eat(bar: Bar): void {
  bar.fed = play(FED_MINUTES);
}

/** Water: no faster sobering, but it eases a hangover's thirst and headache. */
export function sipWater(bar: Bar): void {
  bar.hangover = Math.max(0, bar.hangover - WATER_EASES);
}

/** Moves the bar on `seconds` of play: absorbing, clearing, the hangover. */
export function stepBar(bar: Bar, seconds: number): void {
  const dt = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  if (!Number.isFinite(bar.bac)) bar.bac = 0;
  for (let i = bar.absorbing.length - 1; i >= 0; i--) {
    const a = bar.absorbing[i];
    if (!a) continue;
    const take = Math.min(a.left, a.perSecond * dt);
    bar.bac += take;
    a.left -= take;
    if (a.left <= 1e-9) bar.absorbing.splice(i, 1);
  }
  bar.bac = Math.max(0, bar.bac - CLEAR_PER_SECOND * dt);
  bar.peak = Math.max(bar.peak, bar.bac);
  bar.fed = Math.max(0, bar.fed - dt);
  bar.hangover = Math.max(0, bar.hangover - dt / HANGOVER_SECONDS);
  // sober again: a big night turns into a hangover
  if (bar.bac === 0 && bar.absorbing.length === 0 && bar.peak > 0) {
    if (bar.peak >= HANGOVER_FROM)
      bar.hangover = Math.max(bar.hangover, clamp01((bar.peak - 0.05) / 0.15));
    bar.peak = 0;
  }
}

/** The 0..1 meter the rest of the game reads (BAC / 0.25). */
export const buzzLevel = (bar: Readonly<Bar>): number =>
  clamp01(bar.bac / BAC_FULL);

/** The meter at a BAC, for thresholds. */
const at = (bac: number) => bac / BAC_FULL;

/** How she stands with a drink in her, by BAC stage (the research's dose
 * progression), or hungover; null when sober. */
export const DRUNK_BODY = {
  // 0.02-0.06: looser, bigger gestures, a louder laugh; no sway yet
  tipsy: {
    loops: ["idle-weight-shift", "idle-casual-2", "idle-female"],
    tics: ["laugh", "happy-hands"],
    rate: 1,
  },
  // 0.06-0.15: slower, and the sway starts (on the model root, wobble)
  drunk: {
    loops: ["idle-weight-shift", "idle-bored"],
    tics: ["laugh", "shrug"],
    rate: 0.92,
  },
  // 0.15+: sloppy; the euphoria fades into drowsy, weepy or restless
  sloppy: {
    loops: ["idle-bored", "idle-breathing"],
    tics: ["sigh", "sad", "yawn"],
    rate: 0.82,
  },
  // the morning after: tired, sore, light hurts
  hungover: {
    loops: ["idle-bored", "idle-breathing"],
    tics: ["yawn", "sigh"],
    rate: 0.85,
  },
} as const satisfies Record<string, Body>;

/** How her body shows everything in her: the stronger of the drink and the
 * strongest substance, or a hangover, or null when she's sober. */
export function bodyFor(
  meters: Readonly<Meters>,
  level: number,
  hangover: number,
): Body | null {
  const s = strongest(meters);
  const drug = s ? meters[s].level : 0;
  if (drug > 0 && drug >= clamp01(level)) return bodyOf(meters);
  return drunkBody(level, hangover) ?? bodyOf(meters);
}

export function drunkBody(level: number, hangover: number): Body | null {
  const l = clamp01(level);
  if (l >= at(0.15)) return DRUNK_BODY.sloppy;
  if (l >= at(0.06)) return DRUNK_BODY.drunk;
  if (l >= at(0.02)) return DRUNK_BODY.tipsy;
  return hangover >= 0.1 ? DRUNK_BODY.hungover : null;
}

export const INTENSITIES = ["off", "low", "full"] as const;
export type Intensity = (typeof INTENSITIES)[number];

const INTENSITY_IDS: readonly unknown[] = INTENSITIES;

export function isIntensity(value: unknown): value is Intensity {
  return INTENSITY_IDS.includes(value);
}

export function intensityFactor(intensity: Intensity): number {
  return intensity === "off" ? 0 : intensity === "low" ? 0.5 : 1;
}

// Amounts are the peak values. Sway is in screen UVs, so 0.004 is about 3 px
// on a 720p frame. Sway oscillates below 0.5 Hz, which never reads as a strobe.
export const SWAY_AMOUNT = 0.004;
export const SWAY_HZ = 0.35;
const WARM_AMOUNT = 0.6;
const EDGE_AMOUNT = 0.6;
const GLARE_AMOUNT = 0.5;

export type DrunkLook = {
  /** Screen-space camera sway, in UVs: the eyes' jerk on a side glance
   * (nystagmus), from about 0.06. Zero under reduced motion. */
  sway: number;
  /** How far the doll's walk and idle lean wobble, 0..1: visible body sway
   * is a 0.08+ effect. Zero under reduced motion. */
  wobble: number;
  /** Warm color shift (flushing, feeling warm), 0..1. Kept under reduced motion. */
  warm: number;
  /** Edge darkening (narrowed attention), 0..1. Kept under reduced motion. */
  edge: number;
  /** Double vision, 0..1: a high-BAC effect, from about 0.12. Kept, but
   * held still, under reduced motion. */
  ghost: number;
  /** A hangover's light sensitivity: a washed-out glare, 0..1. */
  glare: number;
};

/** 0 below `from`, rising to 1 at the full meter. */
const from = (level: number, start: number) =>
  clamp01((level - start) / (1 - start));

/** Everything the drunk visuals need, from the buzz (0..1), the hangover,
 * the setting and reduced motion. Each effect starts at the BAC the research
 * puts it at, so a drink or two only warms the colors. */
export function visualParams(
  buzz: number,
  intensity: Intensity,
  calm: boolean,
  hangover = 0,
): DrunkLook {
  const k = intensityFactor(intensity);
  const l = clamp01(buzz);
  return {
    sway: calm ? 0 : from(l, at(0.06)) * k * SWAY_AMOUNT,
    wobble: calm ? 0 : from(l, at(0.08)) * k,
    warm: l * k * WARM_AMOUNT,
    edge: l * k * EDGE_AMOUNT,
    ghost: from(l, at(0.12)) * k,
    glare: clamp01(hangover) * k * GLARE_AMOUNT,
  };
}

// Chat only slurs from about 0.10 BAC, where slurred speech starts.
const DISTORT_FROM = at(0.1);
const STRETCHY = /[aeiouy]/i;

/** A small seeded generator, so the same seed always slurs the same way. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Stretches some vowels in chat, as in "heyyy", when the buzz is up.
 * Deterministic: the same text, buzz and seed always give the same result.
 * `max` caps the stretched line, so it still fits the chat limit.
 */
export function chatDistort(
  text: string,
  buzz: number,
  seed: number,
  max = Infinity,
): string {
  const level = clamp01(buzz);
  if (level < DISTORT_FROM) return text;
  const chance = ((level - DISTORT_FROM) / (1 - DISTORT_FROM)) * 0.5;
  const random = mulberry32(seed);
  let out = "";
  let i = 0;
  for (const ch of text) {
    // draw for every character, so a vowel's roll never depends on earlier text
    const roll = random();
    const stretch = 1 + Math.floor(random() * (1 + 3 * level));
    // stretch only while the rest of the line still fits
    const room = max - out.length - (text.length - i - 1);
    out +=
      STRETCHY.test(ch) && roll < chance && room > 1
        ? ch.repeat(Math.min(stretch, room))
        : ch;
    i++;
  }
  return out;
}

/** The buzz a move's action shows (its "~1".."~3" tag, see peerAction.ts),
 * as a level for effects others apply: the server slurs chat with it. */
export function shownBuzz(action: string): number {
  const tier = /~([1-3])$/.exec(action)?.[1];
  return tier === "3" ? 0.9 : tier === "2" ? 0.6 : tier === "1" ? 0.3 : 0;
}
