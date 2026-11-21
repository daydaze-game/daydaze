// Shared state for the local player's smoke wisp and lighter flicker effects
// when smoking at an outdoor smoking spot.

import { createStore } from "../rooms/shared/store.ts";
import type { WeedDose } from "../../game/inventory.ts";

export type SmokeState = {
  /** The dose type currently in smoke effect ("joint" or "vape"), or null */
  dose: WeedDose | null;
  /** When the action started (in performance.now() or client clock seconds) */
  startedAt: number;
  /** Duration in seconds the visual smoke & flicker lasts (e.g. 5 seconds) */
  duration: number;
};

export const smokeStore = createStore<SmokeState>({
  dose: null,
  startedAt: 0,
  duration: 5,
});

/**
 * Trigger smoking visual effects for a given weed dose.
 */
export function triggerSmoke(dose: WeedDose, now = Date.now() / 1000): void {
  smokeStore.set({
    dose,
    startedAt: now,
    duration: 5,
  });
}
