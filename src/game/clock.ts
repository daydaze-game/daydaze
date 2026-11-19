// Event clocks for schedules every player shares (dance-offs, Pride night,
// fireworks, the parade). Tests and screenshots pin a clock to a moment in an
// event so a slow page load can never miss the window.

/** A clock in seconds on an event's schedule. */
export interface EventClock {
  /** The clock's time, seconds. */
  read(): number;
  /** Lets a held clock run on from where it was held; no-op otherwise. */
  release(): void;
}

/** The real wall clock, seconds. */
export const wallSeconds = (): number => Date.now() / 1000;

/**
 * A clock held `into` seconds into an event that comes round every `every`
 * seconds, until `release()`; from then it runs on at real speed from the
 * held moment.
 */
export function heldClock(
  every: number,
  into: number,
  now: () => number = wallSeconds,
  slot = 1000,
): EventClock {
  const held = every * slot + into;
  let releasedAt: number | null = null;
  return {
    read: () => (releasedAt === null ? held : held + now() - releasedAt),
    release: () => {
      releasedAt ??= now();
    },
  };
}

/**
 * A clock shifted on its first read so it stands `into` seconds into an event
 * (negative: that long before one starts), then runs at real speed.
 */
export function shiftedClock(
  every: number,
  into: number,
  now: () => number = wallSeconds,
): EventClock {
  let offset: number | null = null;
  return {
    read: () => {
      const t = now();
      offset ??= every - (t % every) + into;
      return t + offset;
    },
    release: () => {},
  };
}

/**
 * Seconds to add to clock time `t` so it stands at the start of the next run
 * of an event that comes round every `every` seconds (0 if one starts now).
 * The dev panel uses it to set an event off on demand.
 */
export function toNextStart(t: number, every: number): number {
  const into = ((t % every) + every) % every;
  return into === 0 ? 0 : every - into;
}
