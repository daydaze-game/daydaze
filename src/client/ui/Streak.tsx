// The daily streak's store: whether the panel is open and the milestone to
// celebrate. The HUD counter, panel and celebration are StreakPanel.tsx,
// loaded on demand.
// Rules live in src/game/streak.ts; motion stops under prefers-reduced-motion
// (styles.css).

import type { StreakReward } from "../../game/streak.ts";
import { createStore } from "../rooms/shared/store.ts";

/** Whether the panel is open, and the milestone being celebrated (if any). */
export const streakDesk = createStore({
  open: false,
  celebrate: null as StreakReward | null,
  /** The freeze saved the streak on this check-in. */
  froze: false,
});

export const openStreak = () => streakDesk.set({ open: true });

/** Posts a check-in's news: the milestone to celebrate, and a saved streak. */
export function postCheckIn(reward: StreakReward | undefined, froze: boolean) {
  streakDesk.set({ celebrate: reward ?? null, froze });
}
