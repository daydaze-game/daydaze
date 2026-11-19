// The street dealer: a regular-looking person on a Downtown sidewalk corner
// who sells weed to 18+ players (src/game/inventory.ts, shop "street"). The
// spot only; the NPC is drawn by client/city/StreetDealer.tsx and the shop is
// 18+ only, so at 13+ she is just someone chatting on the corner.

import type { Vec2 } from "../walk.ts";

/** Where she stands: open sidewalk on the avenue, far from the spawn. */
export const DEALER_AT: Vec2 = [-55, 13];
/** How near (meters) the player must be to shop. */
export const DEALER_REACH = 3;

/** Whether (x, z) is within reach of her. */
export const dealerNear = (x: number, z: number): boolean =>
  Math.hypot(DEALER_AT[0] - x, DEALER_AT[1] - z) <= DEALER_REACH;
