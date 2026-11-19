// Pure room definitions, types, spawn points and portals for all venues.
import type { Vec2 } from "./walk.ts";

export const ROOM_IDS = [
  "velvet-room",
  "pulse",
  "violet-hour",
  "plaza",
  "amusement-park",
  "water-park",
  "speedway",
  "apartment",
  "jail",
  "filipino-joint",
  "boba-matcha",
  "ube-bakery",
  "aquarium",
  "ice-rink",
  "haunted-house",
  "rooftop-bar",
  "sugar-rush",
  "warehouse",
  "karaoke",
  "bowling",
  "arcade-bar",
  "la-noche",
  "mini-golf",
  "dome",
  "stadium",
  "kamayan-hall",
  "galleria",
  "roller-rink",
  "skatepark",
  "gridiron",
  "driving-range",
  "gym",
  "marina",
  "courtside",
  "catwalk",
  "mermaid-cove",
  "open-water",
  "reef-dive",
  "skate-diner",
  "halo-halo-cafe",
  "ramen-shop",
  "sushi-bar",
  "lune",
  "bistro",
  "museum",
  "salon",
  "piercing",
  "green-haze",
  "laser-tag",
  "orbit",
  "market",
  "paintball",
  "music-studio",
  "zoo",
  "dealership",
  "jazz-club",
  "vinyl-vault",
  "back-room",
  "tiki-bar",
  "thrift-temple",
  "espresso-lab",
  "hotel-rooftop",
  "bookshop",
  "patisserie",
  "florist",
  "gallery",
  "pottery",
  "surf-shack",
  "boardwalk-arcade",
  "drive-in",
  "wine-bar",
  "video-store",
  "farm",
  "forest",
  "yacht",
  "garden",
  "city",
] as const;

/** Every room's id; ROOMS has one entry per id. */
export type RoomId = (typeof ROOM_IDS)[number];

const ROOM_ID_SET: ReadonlySet<string> = new Set(ROOM_IDS);

/** Where a player appears: a floor point and a yaw (0 faces +z). */
export type Spawn = { position: Vec2; yaw: number };

/**
 * A room's walking rules: the floor polygon, solid blockers on it, the default
 * spawn and the portals out.
 */
export type RoomDefinition = {
  id: RoomId;
  name: string;
  walkable: readonly Vec2[];
  spawn: Spawn;
  /** Dolls wear their swimsuit look here instead of their outfit. */
  swimwear?: boolean;
  /** Solid footprints on the walkable floor (rides, carts), walked around. */
  blockers?: readonly (readonly Vec2[])[];
  portals: readonly {
    id: string;
    position: Vec2;
    radius: number;
    label: string;
    target: RoomId;
    targetSpawn: Spawn;
  }[];
};

/**
 * A door circle: stepping within `radius` of `position` moves the player to
 * `target` at `targetSpawn`.
 */
export type Portal = RoomDefinition["portals"][number];

/** Rooms that are yours alone: online they join no shared copy, so
 * strangers never share one apartment or one cell (until per-player copies). */
export const SOLO_ROOMS: ReadonlySet<RoomId> = new Set<RoomId>([
  "apartment",
  "jail",
]);

/** Whether a value (from storage or the network) is a known room id. */
export function isRoomId(value: unknown): value is RoomId {
  return typeof value === "string" && ROOM_ID_SET.has(value);
}
