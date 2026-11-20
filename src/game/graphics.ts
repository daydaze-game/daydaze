// The graphics settings: the presets (Auto, Performance, Balanced, Realistic),
// the advanced switches behind them, and the checks that keep a stored value
// safe. Pure, so the menu, the save and the renderer all read one definition.

/**
 * The content tiers scenes branch on. Low is the Performance preset and must
 * stay inside the low-tier budget (under 250 draw calls, 300k triangles, 4
 * real lights); high is Balanced; ultra is Realistic.
 */
export type QualityTier = "low" | "high" | "ultra";

/** How far the camera sees. */
export type DrawDistance = "near" | "medium" | "far";

/** Frame-rate cap in frames per second; 0 is uncapped. */
export type FrameCap = 0 | 30 | 60;

/** The advanced switches. A preset is one fixed set of these plus a tier. */
export type Advanced = {
  shadows: boolean;
  /** Screen-space ambient occlusion (darkens creases and contact points). */
  ao: boolean;
  /** Mirror floors; off falls back to the cheap baked stand-ins. */
  reflections: boolean;
  /** The post stack: bloom, tone mapping, vignette. */
  post: boolean;
  /** Bloom intensity, 0 to 2. */
  bloom: number;
  distance: DrawDistance;
  /** The most device pixels per CSS pixel the canvas renders at. */
  scale: number;
  fpsCap: FrameCap;
};

/** Everything the menu sets. */
export type Graphics = Advanced & {
  /** Which preset the values came from; "custom" once one is changed by hand. */
  preset: GraphicsPreset;
  /** The content tier scenes branch on; Custom keeps the tier it began from. */
  tier: QualityTier;
};

/** The presets the menu offers; Auto picks Balanced or Performance by frame rate. */
export const PRESETS = [
  "auto",
  "performance",
  "balanced",
  "realistic",
] as const;
export type Preset = (typeof PRESETS)[number];
export type GraphicsPreset = Preset | "custom";

export const TIERS: readonly QualityTier[] = ["low", "high", "ultra"];
export const DISTANCES: readonly DrawDistance[] = ["near", "medium", "far"];
export const FRAME_CAPS: readonly FrameCap[] = [0, 30, 60];
/** The resolution scales the menu offers (also the only ones a save may hold). */
export const SCALES: readonly number[] = [0.5, 0.75, 1, 1.25, 1.5, 2];
export const MAX_BLOOM = 2;

/** The camera far plane per distance setting, in meters. */
export const DRAW_FAR: Record<DrawDistance, number> = {
  // past the city's sky dome (radius 440), which the fog does not hide
  near: 480,
  medium: 600,
  far: 900,
};

const BALANCED: Graphics = {
  preset: "balanced",
  tier: "high",
  shadows: false,
  ao: false,
  reflections: true,
  post: true,
  bloom: 1.15,
  distance: "medium",
  scale: 1.5,
  fpsCap: 0,
};

const PRESET_VALUES: Record<Exclude<Preset, "auto">, Graphics> = {
  // today's low tier
  performance: {
    ...BALANCED,
    preset: "performance",
    tier: "low",
    reflections: false,
    post: false,
    scale: 1,
  },
  // today's high tier
  balanced: BALANCED,
  realistic: {
    ...BALANCED,
    preset: "realistic",
    tier: "ultra",
    shadows: true,
    ao: true,
    distance: "far",
    scale: 2,
  },
};

/** The preset a tier forced by the `?quality=` flag stands for. */
const TIER_PRESET: Record<QualityTier, Exclude<Preset, "auto">> = {
  low: "performance",
  high: "balanced",
  ultra: "realistic",
};

/**
 * The detail level scenes with a two-entry table (counts, radii) index by:
 * Performance is low, and both Balanced and Realistic get high's numbers.
 */
export function detailOf(tier: QualityTier): "low" | "high" {
  return tier === "low" ? "low" : "high";
}

/** A fresh copy of a preset's values. */
export function presetGraphics(preset: Preset): Graphics {
  return preset === "auto"
    ? { ...BALANCED, preset: "auto" }
    : { ...PRESET_VALUES[preset] };
}

/** What a new player gets: Auto. */
export function defaultGraphics(): Graphics {
  return presetGraphics("auto");
}

/** The values for a tier forced from the URL, whatever the saved preset. */
export function forcedGraphics(tier: QualityTier): Graphics {
  return presetGraphics(TIER_PRESET[tier]);
}

/**
 * What Auto renders after `step` declines of the frame-rate monitor: first it
 * gives up the extra resolution, then it drops to the Performance tier.
 */
export function autoGraphics(step: number): Graphics {
  if (step >= 2) return { ...PRESET_VALUES.performance, preset: "auto" };
  return {
    ...BALANCED,
    preset: "auto",
    scale: step === 1 ? 1 : BALANCED.scale,
  };
}

/** Changes advanced settings and flips the preset to Custom. */
export function changeAdvanced(
  graphics: Graphics,
  patch: Partial<Advanced>,
): Graphics {
  return { ...graphics, ...patch, preset: "custom" };
}

function isPreset(value: unknown): value is Preset {
  return PRESETS.some((p) => p === value);
}

function isTier(value: unknown): value is QualityTier {
  return TIERS.some((t) => t === value);
}

function isDistance(value: unknown): value is DrawDistance {
  return DISTANCES.some((d) => d === value);
}

function isFrameCap(value: unknown): value is FrameCap {
  return FRAME_CAPS.some((c) => c === value);
}

function isScale(value: unknown): value is number {
  return typeof value === "number" && SCALES.includes(value);
}

/** The pre-menu setting: auto, high or low. */
function legacyPreset(legacy: unknown): Preset {
  return legacy === "high"
    ? "balanced"
    : legacy === "low"
      ? "performance"
      : "auto";
}

/**
 * Validates stored graphics settings field by field. A named preset takes its
 * own values (what is stored under it cannot drift from the menu); Custom keeps
 * every valid field and fills the rest from Balanced. Anything else falls back
 * to `legacy`, the old `quality` setting (auto, high or low), else Auto.
 */
export function cleanGraphics(raw: unknown, legacy?: unknown): Graphics {
  const fields: Map<string, unknown> = new Map(
    typeof raw === "object" && raw !== null && !Array.isArray(raw)
      ? Object.entries(raw)
      : [],
  );
  const preset = fields.get("preset");
  if (isPreset(preset)) return presetGraphics(preset);
  if (preset !== "custom") return presetGraphics(legacyPreset(legacy));
  const shadows = fields.get("shadows");
  const ao = fields.get("ao");
  const reflections = fields.get("reflections");
  const post = fields.get("post");
  const bloom = fields.get("bloom");
  const tier = fields.get("tier");
  const distance = fields.get("distance");
  const scale = fields.get("scale");
  const fpsCap = fields.get("fpsCap");
  return {
    preset: "custom",
    tier: isTier(tier) ? tier : BALANCED.tier,
    shadows: typeof shadows === "boolean" ? shadows : BALANCED.shadows,
    ao: typeof ao === "boolean" ? ao : BALANCED.ao,
    reflections:
      typeof reflections === "boolean" ? reflections : BALANCED.reflections,
    post: typeof post === "boolean" ? post : BALANCED.post,
    bloom:
      typeof bloom === "number" && bloom >= 0 && bloom <= MAX_BLOOM
        ? bloom
        : BALANCED.bloom,
    distance: isDistance(distance) ? distance : BALANCED.distance,
    scale: isScale(scale) ? scale : BALANCED.scale,
    fpsCap: isFrameCap(fpsCap) ? fpsCap : BALANCED.fpsCap,
  };
}
