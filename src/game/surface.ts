// Surface materials underfoot for footsteps: wood, tile, metal, gravel,
// puddle, hard and soft. Pure.

import type { RoomId } from "./roomTypes.ts";

export type FootstepSurface =
  "hard" | "soft" | "wood" | "tile" | "metal" | "gravel" | "puddle";

const WOOD = /bowling|arcade|diner|book|wine|tiki|yacht|roof|apart/;
const METAL = /catwalk|ware|marina|laser|stadium|speedway|roller|orbit/;
const GRAVEL = /garden|forest|farm|paint|zoo|drive-in/;
const SOFT = /open-water|golf|range|grid|velvet|haze/;
const PUDDLE = /reef|cove/;
const TILE =
  /water-park|aqua|patisserie|lab|bistro|ramen|sushi|salon|piercing|museum|galleria|plaza|noche|boba|bakery|joint|hall|jail|rush|karaoke/;

/** The surface underfoot for a room, defaulting to hard pavement/flooring. */
export function roomSurface(roomId: RoomId): FootstepSurface {
  if (WOOD.test(roomId)) return "wood";
  if (TILE.test(roomId)) return "tile";
  if (METAL.test(roomId)) return "metal";
  if (GRAVEL.test(roomId)) return "gravel";
  if (SOFT.test(roomId)) return "soft";
  if (PUDDLE.test(roomId)) return "puddle";
  return "hard";
}
