// What the city's ground is underfoot, for the footstep sounds: pavement,
// the boardwalk's planks, beach sand, park lawns, gravel yards or puddles. Pure.
import { BOARDWALK, PARK, WATER_Z } from "./layout.ts";
import { DOG_PARK, MARKET_GREEN, PATH_EW, PATH_NS } from "./park.ts";

export type Ground =
  "pavement" | "wood" | "sand" | "grass" | "gravel" | "puddle";

const inBox = (
  box: { x0: number; x1: number; z0: number; z1: number },
  x: number,
  z: number,
) => x >= box.x0 && x <= box.x1 && z >= box.z0 && z <= box.z1;

/** The ground at a city point (x, z in meters). */
export function groundAt(x: number, z: number): Ground {
  if (z >= BOARDWALK.z0 && z <= BOARDWALK.z1) return "wood";
  if (z >= WATER_Z - 3 && z <= WATER_Z + 4) return "puddle";
  if (z > BOARDWALK.z1 && z < WATER_Z) return "sand";
  if (inBox(DOG_PARK, x, z) || inBox(MARKET_GREEN, x, z)) return "gravel";
  if (inBox(PATH_EW, x, z) || inBox(PATH_NS, x, z)) return "pavement";
  if (inBox(PARK, x, z)) return "grass";
  return "pavement";
}
