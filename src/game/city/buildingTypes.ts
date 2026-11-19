// Building styles, neighborhood ids, and surface geometry types for the city.
import type { Vec2 } from "../walk.ts";
import type { RoomId, Spawn } from "../roomTypes.ts";

export type Neighborhood =
  | "downtown"
  | "nightlife-row"
  | "beachside"
  | "little-manila"
  | "arts-district"
  | "chinatown-koreatown"
  | "uptown"
  | "suburbia"
  | "fairground";

export type RoadNode = { id: string; position: Vec2 };
export type RoadEdge = {
  from: string;
  to: string;
  /** Meters of asphalt across the edge. */
  width: number;
  /** Lanes in both directions. */
  lanes: number;
  /** Meters per second. */
  speedLimit: number;
};

export type BuildingStyle =
  | "tower"
  | "glass"
  | "billboard"
  | "storefront"
  | "deck"
  | "brick"
  | "club"
  | "warehouse"
  | "velvet"
  | "gate";

export type Door = {
  position: Vec2;
  radius: number;
  label: string;
  target: RoomId;
  targetSpawn: Spawn;
};

export type Building = {
  id: string;
  neighborhood: Neighborhood;
  footprint: readonly Vec2[];
  height: number;
  style: BuildingStyle;
  /** Paint over the style's own color (pastel beach houses). */
  color?: string;
  sign?: { text: string; color: string };
  /** A line of people waits on the forecourt. */
  queue?: boolean;
  door?: Door;
  /** Which wall carries the dressing, when not the one the street or door picks. */
  front?: "zmin" | "zmax" | "xmin" | "xmax";
};

export type Surface = {
  kind: "road" | "sidewalk" | "square" | "boardwalk" | "sand" | "lawn";
  polygon: readonly Vec2[];
};

export type PropKind = "lamp" | "palm" | "tree";
export type Prop = { kind: PropKind; position: Vec2 };
