// The jukebox track ids. They live in src/game so pure game rules (events)
// can name a track without importing src/audio; the audio layer re-exports it.

/** Every track the jukebox can play. */
export type TrackId =
  | "savanna-nightclub"
  | "canopy-lofi"
  | "waterhole-twilight"
  | "carnival-calliope"
  | "sugar-rush-pop"
  | "warehouse-acid"
  | "player-two-chiptune"
  | "la-noche-salsa"
  | "roller-disco";
