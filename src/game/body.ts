// Body-shape sliders in the closet. Weight and muscle drive fitted morphs;
// the other traits adjust proportions. All saved values are whole 0 to 100.
import type { Figure } from "./look.ts";

export const BODY_SCALE_TRAITS = ["bust", "hips", "waist", "height"] as const;
export const BODY_TRAITS = ["weight", "muscle", ...BODY_SCALE_TRAITS] as const;

export type BodyTrait = (typeof BODY_TRAITS)[number];

export type BodyShape = Record<BodyTrait, number>;

export const BODY_LABELS: Record<BodyTrait, string> = {
  weight: "Weight",
  muscle: "Muscle definition",
  bust: "Bust",
  hips: "Hips and butt",
  waist: "Waist",
  height: "Height",
};

// The scale at slider 0 and slider 100. Waist 0 is the slimmest.
type ScaleTrait = (typeof BODY_SCALE_TRAITS)[number];
const SCALE_RANGE: Record<ScaleTrait, readonly [number, number]> = {
  bust: [0.94, 1.06],
  hips: [0.92, 1.08],
  waist: [0.9, 1.1],
  height: [0.94, 1.06],
};

const MIDDLE = 50;

export const DEFAULT_BODY: BodyShape = {
  weight: MIDDLE,
  muscle: 0,
  bust: MIDDLE,
  hips: MIDDLE,
  waist: MIDDLE,
  height: MIDDLE,
};

/** Rounds to a whole slider step and clamps; NaN falls back to the middle. */
export function clampTrait(value: number): number {
  if (!Number.isFinite(value)) return MIDDLE;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** Each saved trait that is a whole 0 to 100 value, the default for the rest. */
export function cleanBody(value: unknown): BodyShape {
  const fields = new Map<string, unknown>(
    typeof value === "object" && value !== null ? Object.entries(value) : [],
  );
  const body = { ...DEFAULT_BODY };
  for (const trait of BODY_TRAITS) {
    const saved = fields.get(trait);
    if (
      typeof saved === "number" &&
      Number.isInteger(saved) &&
      saved >= 0 &&
      saved <= 100
    ) {
      body[trait] = saved;
    }
  }
  return body;
}

/** The multiplier each part of the doll is drawn at. */
export function bodyScales(body: BodyShape): Record<BodyTrait, number> {
  const scale = (trait: ScaleTrait) => {
    const [low, high] = SCALE_RANGE[trait];
    return low + ((high - low) * body[trait]) / 100;
  };
  return {
    weight: 1,
    muscle: 1,
    bust: scale("bust"),
    hips: scale("hips"),
    waist: scale("waist"),
    height: scale("height"),
  };
}

/** Shared morph influences for skin, hair, and fitted clothes. Weight blends
 * from the selected preset toward slim/full endpoints without stacking two
 * full-weight silhouettes. Muscle can be added to any weight. */
export function figureMorphs(body: BodyShape, figure: Figure) {
  const weight = (body.weight - MIDDLE) / MIDDLE;
  const preset = 1 - Math.abs(weight);
  return {
    curvy: figure === "curvy" ? preset : 0,
    slim: (figure === "slim" ? preset : 0) + Math.max(0, -weight),
    athletic: Math.max(figure === "athletic" ? preset : 0, body.muscle / 100),
    plus: (figure === "plus" ? preset : 0) + Math.max(0, weight),
  };
}
