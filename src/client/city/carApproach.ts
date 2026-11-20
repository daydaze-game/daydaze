// Cancel the walk requested when approaching the player's city car.
import type { Walker } from "../../game/walker.ts";

export function cancelCarApproach(
  walker: Pick<Walker, "target">,
  heading: boolean,
): void {
  if (heading) walker.target = null;
}
