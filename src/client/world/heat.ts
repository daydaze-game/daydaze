// The player's police heat (game/wanted/wanted.ts): crimes add to it and it
// cools off out of sight. A plain module value, read each frame.
// shortcut: no police see the player yet, so it only cools; the wanted HUD,
// sightings and arrests are #209's, which should take this store over.

import {
  NOT_WANTED,
  commitCrime,
  stepWanted,
  type CrimeKind,
  type WantedState,
} from "../../game/wanted/wanted.ts";

export const heat: { state: WantedState } = { state: NOT_WANTED };

/** Adds a crime's heat. */
export function crime(kind: CrimeKind): void {
  heat.state = commitCrime(heat.state, kind).state;
}

/** Cools the heat by `dtMs` out of the police's sight. */
export function coolHeat(dtMs: number): void {
  if (heat.state.heat > 0)
    heat.state = stepWanted(heat.state, dtMs, {
      inSight: false,
      hiding: false,
    }).state;
}
