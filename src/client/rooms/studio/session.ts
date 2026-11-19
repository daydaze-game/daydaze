// The studio's client state: which instrument the panel picked and the last
// note played, so the scene can light the right one.
import { playInstrumentNote } from "../../../audio/instrumentSynths.ts";
import type { Station } from "../../../game/studio.ts";
import { createStore } from "../shared/store.ts";

// A function, not a const: a typed const would narrow back to its literal.
const firstStation = (): Station => "piano";

/** The instrument picked on the panel (the scene picks the one you walk up
 * to), and the last note played, so the scene can light it. */
export const studio = createStore<{
  station: Station;
  last: { station: Station; note: number; at: number } | null;
}>({
  station: firstStation(),
  last: null,
});

export function pick(station: Station) {
  if (studio.get().station !== station) studio.set({ station });
}

/** Plays note 0..7 on the picked instrument. */
export function play(note: number) {
  const { station } = studio.get();
  playInstrumentNote(station, note);
  studio.set({ last: { station, note, at: performance.now() } });
}
