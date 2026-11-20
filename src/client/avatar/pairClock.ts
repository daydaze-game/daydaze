// The clock a pair's timed moves run on (moves.ts `synced`: the kisses): wall
// seconds, one clock for every doll on this screen, so both partners lean in
// together where each doll's own clock would drift them apart. (Another
// screen may be a moment ahead or behind; its two dolls agree with each
// other.) The doll lab pins it to shoot one exact moment.

let pinned: number | null = null;

/** Seconds on the pair clock. */
export const pairNow = (): number => pinned ?? Date.now() / 1000;

/** Holds the pair clock at `seconds` (the doll lab's `?at=`). */
export function pinPairClock(seconds: number): void {
  pinned = seconds;
}
