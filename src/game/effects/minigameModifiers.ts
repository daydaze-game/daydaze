// Small deterministic cannabis assists for offline adult minigame sessions.

const clamp01 = (value: number): number =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

/** The local weed meter's eligible assist; online and under-18 play stay sober. */
export function highAssist(
  level: number,
  adultAllowed: boolean,
  online: boolean,
): number {
  return adultAllowed && !online ? clamp01(level) : 0;
}

/** Widen a timing tolerance by up to 25 percent. */
export function timingWindow(baseMs: number, assist: number): number {
  return baseMs * (1 + clamp01(assist) * 0.25);
}

/** Lengthen a sweep's period by up to 15 percent. */
export function sweepDuration(baseMs: number, assist: number): number {
  return baseMs * (1 + clamp01(assist) * 0.15);
}
