// Types and genre definitions for the karaoke songbook.

export const GENRES = [
  "classical",
  "folk",
  "country",
  "gospel",
  "jazz",
  "ragtime",
  "tin-pan-alley",
  "latin",
  "world",
  "holiday",
  "party",
  "blues",
  "music-hall",
  "shanty",
  "lullaby",
  "opera",
  "school",
  "patriotic",
  "celtic",
] as const;

export type Genre = (typeof GENRES)[number];

export type KaraokeSong = {
  id: string;
  title: string;
  /** Composer or source, and the year (or "trad."): what the picker shows. */
  credit: string;
  /** Who wrote it ("Traditional" for a folk tune). */
  composer: string;
  /** The year it was published; for a traditional tune, a year by which it
   * was certainly in print. Always 1929 or earlier. */
  year: number;
  genre: Genre;
  /** Beats a minute: the beat is the unit the melody's lengths count in. */
  bpm: number;
  /** Beats a bar (default 4); the band changes chord once a bar. */
  meter?: number;
  /** Beats before the first downbeat (a pickup), default 0. */
  pickup?: number;
  /** The key, for a tune whose written melody stops off its home note
   * (otherwise the last note is taken as home): tonic pitch class (0 = C). */
  key?: { tonic: number; minor: boolean };
  melody: string;
};
