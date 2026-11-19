// Surface materials underfoot for footsteps: wood, tile, metal, gravel,
// puddle, hard and soft. Pure.

import type { RoomId } from "./roomTypes.ts";

export type FootstepSurface =
  "hard" | "soft" | "wood" | "tile" | "metal" | "gravel" | "puddle";

const ROOM_SURFACES: Partial<Record<RoomId, FootstepSurface>> = {
  // Wood
  bowling: "wood",
  "arcade-bar": "wood",
  "boardwalk-arcade": "wood",
  "skate-diner": "wood",
  bookshop: "wood",
  "wine-bar": "wood",
  "tiki-bar": "wood",
  yacht: "wood",
  "hotel-rooftop": "wood",
  "rooftop-bar": "wood",
  apartment: "wood",

  // Tile
  "water-park": "tile",
  aquarium: "tile",
  patisserie: "tile",
  "espresso-lab": "tile",
  bistro: "tile",
  "ramen-shop": "tile",
  "sushi-bar": "tile",
  salon: "tile",
  piercing: "tile",
  museum: "tile",
  galleria: "tile",
  plaza: "tile",
  "la-noche": "tile",
  "boba-matcha": "tile",
  "ube-bakery": "tile",
  "filipino-joint": "tile",
  "kamayan-hall": "tile",
  jail: "tile",
  "sugar-rush": "tile",
  karaoke: "tile",

  // Metal
  catwalk: "metal",
  warehouse: "metal",
  marina: "metal",
  "laser-tag": "metal",
  stadium: "metal",
  speedway: "metal",
  "roller-rink": "metal",
  orbit: "metal",

  // Gravel / Earth
  garden: "gravel",
  forest: "gravel",
  farm: "gravel",
  paintball: "gravel",
  zoo: "gravel",
  "drive-in": "gravel",

  // Soft / Turf / Carpet
  "mini-golf": "soft",
  "driving-range": "soft",
  gridiron: "soft",
  "velvet-room": "soft",
  "green-haze": "soft",

  // Wet / Water
  "open-water": "puddle",
  "reef-dive": "puddle",
  "mermaid-cove": "puddle",
};

/** The surface underfoot for a room, defaulting to hard pavement/flooring. */
export function roomSurface(roomId: RoomId): FootstepSurface {
  return ROOM_SURFACES[roomId] ?? "hard";
}
