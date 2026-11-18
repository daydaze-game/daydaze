// Acid's tracers: how much of the last frame's history survives into the next.
// Pure, so the frame-rate independence is tested.

/** Fade kept per frame at 60 Hz: a trail dies in about half a second. */
export const TRACER_DAMP = 0.86;

/** The fade for a frame that took `dt` seconds, so a trail lasts the same
 * time at 30 Hz and at 144 Hz. A bad `dt` (zero, negative, NaN, infinite)
 * counts as one 60 Hz frame. */
export function tracerDamp(dt: number): number {
  const frames = Number.isFinite(dt) && dt > 0 ? dt * 60 : 1;
  return TRACER_DAMP ** frames;
}
