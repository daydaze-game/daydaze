// The clock a pair's timed moves run on (moves.ts `synced`: the kisses): wall
// seconds, so both partners reach the same moment together on every screen,
// where each doll's own clock would drift them apart. The doll lab pins it to
// shoot one exact moment.

let pinned: number | null = null;

/** Seconds on the pair clock. */
export const pairNow = (): number => pinned ?? Date.now() / 1000;

/** Holds the pair clock at `seconds` (the doll lab's `?at=`). */
export function pinPairClock(seconds: number): void {
  pinned = seconds;
}
