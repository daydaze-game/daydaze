// Exact costs follow the rendered model: a landmark replaces its family mesh.
import type { DreamSpot } from "./dream.ts";
import { DREAM_MODEL_COST } from "./dreamCosts.generated.ts";
import { DREAM_LANDMARK_COST } from "./dreamLandmarkCosts.generated.ts";

export function dreamTriangles(spot: DreamSpot): number {
  const cost = spot.landmark
    ? DREAM_LANDMARK_COST[spot.landmark]
    : DREAM_MODEL_COST[spot.kind];
  return spot.far ? cost.lo : cost.tris;
}

/** Families instance together; unique textured landmarks draw their parts. */
export function dreamDrawCalls(spots: readonly DreamSpot[]): number {
  const families = new Set<string>();
  let calls = 0;
  for (const spot of spots) {
    if (spot.landmark) {
      const cost = DREAM_LANDMARK_COST[spot.landmark];
      calls += spot.far ? cost.loParts : cost.parts;
    } else families.add(`${spot.kind}${spot.far}`);
  }
  return calls + families.size;
}
