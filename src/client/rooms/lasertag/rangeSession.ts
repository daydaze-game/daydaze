// Photon Zone's target-range session: the pure drill (targetRange.ts) on a
// clock, plus where the player is aiming on the wall and the last shot, so
// the range scene (Range.tsx) can draw the beam and the lit target.

import { ARENA } from "../../../game/laserTag.ts";
import {
  drillOver,
  type Drill,
  DRILL_SECONDS,
  fireAt,
  newDrill,
  RAIL_Y,
  type Gun,
  type Target,
} from "../../../game/targetRange.ts";
import { award } from "../../ui/prizeDesk.ts";
import { createStore } from "../shared/store.ts";

export type Phase = "off" | "playing" | "over";

interface State {
  phase: Phase;
  drill: Drill;
  /** performance.now() the drill began. */
  since: number;
  /** Where the beam will hit: [x, y] on the wall. */
  aim: [number, number];
  /** The last shot: where, when, what it lit; `n` counts shots. */
  shot: {
    at: [number, number];
    when: number;
    lit: Target | null;
    n: number;
  } | null;
}

const OFF: State = {
  phase: "off",
  drill: newDrill("pistol", 1),
  since: 0,
  aim: [0, RAIL_Y[1]],
  shot: null,
};

export const range = createStore(OFF);

export const drillTime = (now: number) => (now - range.get().since) / 1000;

export function start(gun: Gun, now: number) {
  range.set({
    ...OFF,
    phase: "playing",
    drill: newDrill(gun, Math.floor(Math.random() * 1e9)),
    since: now,
  });
}

export const leave = () => range.set(OFF);

/** Aims at a point on the wall, kept on it. */
export function aimAt(x: number, y: number) {
  if (range.get().phase !== "playing") return;
  range.set({
    aim: [
      Math.min(ARENA.x1 - 0.5, Math.max(ARENA.x0 + 0.5, x)),
      Math.min(3.2, Math.max(0.4, y)),
    ],
  });
}

export function nudge(dx: number, dy: number) {
  const [x, y] = range.get().aim;
  aimAt(x + dx, y + dy);
}

export function fire(now: number) {
  const s = range.get();
  if (s.phase !== "playing") return;
  const at: [number, number] = [s.aim[0], s.aim[1]];
  const { drill, lit } = fireAt(s.drill, at[0], at[1], drillTime(now));
  range.set({ drill, shot: { at, when: now, lit, n: (s.shot?.n ?? 0) + 1 } });
  tick(now);
}

export function tick(now: number) {
  const s = range.get();
  if (s.phase !== "playing" || !drillOver(s.drill, drillTime(now))) return;
  range.set({ phase: "over", since: now });
  award(`range-${s.drill.gun}`, s.drill.score);
}

export const secondsLeft = (now: number) =>
  Math.max(0, Math.ceil(DRILL_SECONDS - drillTime(now)));
