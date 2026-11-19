// How long a screencast frame strip keeps recording: at least a minimum
// window, then until enough frames have arrived, never past a maximum. A fixed
// window ended before a slow room delivered any frame (issue #75: green-haze
// at high quality sends its first screencast frame after about 25 s on CI).

/** A clock the wait reads and sleeps on, so tests can run it in no time. */
export type WaitClock = {
  now: () => number;
  sleep: (ms: number) => Promise<void>;
};

export type WaitForFramesOptions = {
  /** How many frames have arrived so far. */
  have: () => number;
  /** How many frames the strip needs. */
  want: number;
  /** Keep recording at least this long even when the frames are in. */
  minMs: number;
  /** Stop here whether or not the frames arrived. */
  maxMs: number;
  /** How often to look, in ms. */
  pollMs?: number;
  clock: WaitClock;
};

/**
 * Waits until `minMs` has passed and `want` frames are in, or `maxMs` has
 * passed. `reached` says whether the frames arrived; `elapsedMs` is the time
 * it waited.
 */
export async function waitForFrames({
  have,
  want,
  minMs,
  maxMs,
  pollMs = 1000,
  clock,
}: WaitForFramesOptions): Promise<{ reached: boolean; elapsedMs: number }> {
  const start = clock.now();
  for (;;) {
    const elapsedMs = clock.now() - start;
    if (elapsedMs >= maxMs) return { reached: have() >= want, elapsedMs };
    if (elapsedMs >= minMs && have() >= want)
      return { reached: true, elapsedMs };
    await clock.sleep(Math.min(pollMs, maxMs - elapsedMs));
  }
}
