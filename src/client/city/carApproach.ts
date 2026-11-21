// Track ownership of the walk requested when approaching the city car.
import type { Walker } from "../../game/walker.ts";
import type { Vec2 } from "../../game/walk.ts";

export function ownsCarApproach(
  walker: Pick<Walker, "target">,
  target: Vec2 | null,
): boolean {
  return target !== null && walker.target === target;
}

export function cancelCarApproach(
  walker: Pick<Walker, "target">,
  target: Vec2 | null,
): void {
  if (ownsCarApproach(walker, target)) walker.target = null;
}
