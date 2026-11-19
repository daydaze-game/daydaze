// Dressing types: instance buckets, fronts and placed props for the city.
import type { Vec2 } from "../walk.ts";
import type { Instance, Kind } from "./instanceTypes.ts";

export type Placed = { at: Vec2; kind: Kind; instance: Instance };
export type Buckets = Record<Kind, Instance[]>;

/** Where a building faces the avenue, and which way is out of it. */
export type Front = {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  cx: number;
  cz: number;
  w: number;
  h: number;
  faceZ: number;
  out1: number;
};
