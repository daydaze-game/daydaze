// Weed's munchies and dry mouth are gentle, temporary needs, never penalties.
// They build with felt weed, fade sober, and food/drinks relieve them without
// changing any substance meter. The caller supplies the adult gate.
import { FELT } from "../effects/substances.ts";

export type Needs = { hunger: number; thirst: number };
export const NEED_NOTICE = 0.25;
export const freshNeeds = (): Needs => ({ hunger: 0, thirst: 0 });

export function stepNeeds(
  needs: Needs,
  high: number,
  seconds: number,
  adultOk: boolean,
): Needs {
  if (!adultOk) return freshNeeds();
  if (!Number.isFinite(seconds) || seconds <= 0) return needs;
  const felt = Number.isFinite(high) && high >= FELT ? Math.min(1, high) : 0;
  return {
    hunger: Math.max(
      0,
      Math.min(1, needs.hunger + seconds * (felt ? felt / 120 : -1 / 60)),
    ),
    thirst: Math.max(
      0,
      Math.min(1, needs.thirst + seconds * (felt ? felt / 90 : -1 / 60)),
    ),
  };
}

export function satisfyNeed(needs: Needs, kind: "food" | "drink"): Needs {
  return kind === "food"
    ? { ...needs, hunger: Math.max(0, needs.hunger - 0.65) }
    : { ...needs, thirst: Math.max(0, needs.thirst - 0.8) };
}
