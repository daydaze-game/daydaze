// WalkArea types: surfaces, blockers and portals.
import type { Vec2 } from "./walk.ts";
import type { Portal } from "./roomTypes.ts";

/** Meters the player's body keeps clear of a blocker's edge. */
export const BODY_RADIUS = 0.35;

/**
 * Where a player can stand and what stops them. Surfaces may overlap; a
 * point is walkable if any surface holds it. Blockers are solid footprints.
 */
export type WalkArea = {
  surfaces: readonly (readonly Vec2[])[];
  blockers: readonly (readonly Vec2[])[];
  portals: readonly Portal[];
};
