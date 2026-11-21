// Music rooms where being high gives a subtle audio lift (reverb bloom, low-pass
// roll-off) to the room track: vinyl vault, karaoke loft, and DJ clubs/stages.
import type { RoomId } from "./rooms.ts";

/** Rooms with music focus: record store, karaoke, and clubs/venues with a DJ booth or stage. */
export const MUSIC_ROOMS: readonly RoomId[] = [
  "vinyl-vault",
  "karaoke",
  "pulse",
  "orbit",
  "warehouse",
  "rooftop-bar",
  "sugar-rush",
  "roller-rink",
  "yacht",
];

/** Whether a room is a music venue eligible for high audio lift. */
export function isMusicRoom(room: RoomId): boolean {
  return MUSIC_ROOMS.includes(room);
}
