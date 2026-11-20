// Where the shared jukebox controller is kept once something has made it.
// Split from proceduralJukebox.ts so the beat clock (danceClock.ts) can peek
// at it without pulling the synthesis code into the first load. The controller
// types live here too, so this file never imports proceduralJukebox.ts back.

import type { TrackId } from "../game/trackId.ts";

/**
 * Plays one track at a time. Volume is 0 to 1; playTrack returns false when
 * audio is unavailable or the controller is disposed.
 */
export interface JukeboxController {
  /** Any string is accepted; an id that is not a track plays nothing. */
  playTrack(id: string): boolean;
  stopTrack(): void;
  getCurrentTrack(): TrackId | null;
  isPlaying(): boolean;
  setMusicVolume(vol: number): void;
  getMusicVolume(): number;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
  dispose(): void;
  /** The playing track, its BPM, and the audio time its first beat fell on
   * (step 0 of its grid, kept current if the loop resyncs). */
  currentTempo(): {
    track: TrackId | null;
    bpm: number;
    startedAt: number;
  } | null;
  /** The audio clock (seconds) while the context runs; null otherwise. */
  audioTime(): number | null;
  /**
   * A sung melody note on `lane` (0 low, 1 mid, 2 high) over beat `beat` of
   * the playing track, at audio time `at` (now if omitted); `hit` false sings
   * it sour and soft.
   */
  playMelody(beat: number, lane: number, hit: boolean, at?: number): void;
  /** A sung note at its real pitch (MIDI), a karaoke song's melody. */
  playPitch(midi: number, hit: boolean): void;
  /**
   * Swaps the playing track for a karaoke band at `bpm` (currentTempo
   * reports it, its first step now); false without audio.
   */
  playSong(band: KaraokeBand, bpm: number): boolean;
  /** The song's over: back to the track that was playing before it. */
  endSong(): void;
}

/** What a karaoke song's band plays (bandPlan in src/game/karaokeSongs.ts):
 * beats a bar, the pickup before the first downbeat, the count-in beats
 * before the melody, and a triad a bar as pitch classes (0 = C). */
export type KaraokeBand = {
  beatsPerBar: number;
  pickup: number;
  countIn: number;
  chords: readonly (readonly number[])[];
};

let shared: JukeboxController | null = null;

/** The shared controller if something has made it, without waking audio: the
 * dancers' beat clock reads it and must not start an AudioContext. */
export function peekSharedJukeboxController(): JukeboxController | null {
  return shared;
}

/** Called by getSharedJukeboxController when it makes the controller. */
export function setSharedJukeboxController(
  controller: JukeboxController,
): void {
  shared = controller;
}
