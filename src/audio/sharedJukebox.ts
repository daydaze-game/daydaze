// Where the shared jukebox controller is kept once something has made it.
// Split from proceduralJukebox.ts so the beat clock (danceClock.ts) can peek
// at it without pulling the synthesis code into the first load.

import type { JukeboxController } from "./proceduralJukebox.ts";

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
