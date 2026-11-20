// Outdoor smoking spots: where in the city or on rooftops a player can smoke
// after dark (behind ADULT_OK). Pure data and geometry; the client's overlay
// and smoke/lighter visuals read it.

import type { RoomId } from "../rooms.ts";
import type { Vec2 } from "../walk.ts";
import { BONFIRES } from "./layout.ts";
import { DECK as BOARDWALK_DECK } from "./boardwalk.ts";
import { DECK as SKYLARK_DECK } from "../rooftop.ts";
import { BOUNDS as HOTEL_BOUNDS } from "../hotelRooftop.ts";
import { daylightAt } from "./daylight.ts";

export type SmokingSpotId =
  "boardwalk-bench" | "beach-fire" | "skylark-rooftop" | "hotel-rooftop";

export type SmokingSpot = {
  id: SmokingSpotId;
  name: string;
  room: RoomId;
  center: Vec2;
  radius: number;
};

/**
 * The designated outdoor spots where smoking (joint or vape) is permitted:
 * - Boardwalk benches along Beachside deck
 * - Beach bonfire circles on the sand
 * - Skylark rooftop bar deck (open outdoor area)
 * - Vesper Hotel rooftop terrace
 */
export const SMOKING_SPOTS: readonly SmokingSpot[] = [
  {
    id: "boardwalk-bench",
    name: "Boardwalk Bench",
    room: "city",
    center: [6, (BOARDWALK_DECK.z0 + BOARDWALK_DECK.z1) / 2],
    radius: 4.5,
  },
  {
    id: "beach-fire",
    name: "Beach Bonfire",
    room: "city",
    center: [BONFIRES[1][0], BONFIRES[1][1]],
    radius: 5.0,
  },
  {
    id: "skylark-rooftop",
    name: "Skylark Rooftop",
    room: "rooftop-bar",
    center: [
      (SKYLARK_DECK.x0 + SKYLARK_DECK.x1) / 2,
      (SKYLARK_DECK.z0 + SKYLARK_DECK.z1) / 2,
    ],
    radius: 7.5,
  },
  {
    id: "hotel-rooftop",
    name: "Hotel Rooftop",
    room: "hotel-rooftop",
    center: [
      (HOTEL_BOUNDS.x0 + HOTEL_BOUNDS.x1) / 2,
      (HOTEL_BOUNDS.z0 + HOTEL_BOUNDS.z1) / 2,
    ],
    radius: 9.0,
  },
];

/**
 * Whether the local city/room light counts as "after dark":
 * When sun is low (sun < 0.25) or neon has kicked on (neon > 0.45).
 * Equivalent to evening dusk into late night.
 */
export function isAfterDark(hour: number): boolean {
  const d = daylightAt(hour);
  return d.sun < 0.25 || d.neon > 0.45;
}

/**
 * Finds if a player at `pos` in `room` is within an allowed smoking spot.
 */
export function smokingSpotAt(
  room: RoomId,
  pos: readonly [number, number],
): SmokingSpot | null {
  for (const spot of SMOKING_SPOTS) {
    if (spot.room !== room) continue;
    const dist = Math.hypot(pos[0] - spot.center[0], pos[1] - spot.center[1]);
    if (dist <= spot.radius) return spot;
  }
  return null;
}
