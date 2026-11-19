// Palette and counter staff definitions for shared food venue rooms.
import type { RoomId } from "../../../game/rooms.ts";
import type { DialogueRole } from "../../../game/dialogue/types.ts";
import type { Look } from "../../../game/look.ts";

export type FoodPalette = {
  room: RoomId;
  background: string;
  fog: string;
  sky: string;
  ground: string;
  light: string;
  floor: string;
  wall: string;
  counter: string;
  accent: string;
};

export type CounterStaff = {
  name: string;
  role: DialogueRole;
  look: Look;
  seed: number;
};
