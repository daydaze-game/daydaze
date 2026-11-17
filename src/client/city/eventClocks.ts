// The city's event clocks: the real one, or with `?<flag>=<s>` held still `s`
// seconds into an event, so screenshots catch it however long the page takes
// to load. In development the dev panel can also skip a clock forward to an
// event's next start (devStartEvent, devStartNight).

import { SHOW_EVERY } from "../../game/city/fireworks.ts";
import { PARADE_EVERY } from "../../game/city/parade.ts";
import { HEIST_SLOT, heistOffset, nextHeistIn } from "../../game/city/heist.ts";
import { heldClock, toNextStart, wallSeconds } from "../../game/clock.ts";
import { PRIDE_EVERY } from "../../game/prideNight.ts";
import { schedule } from "../../game/events.ts";

/** The city events the dev panel can set off. */
export const DEV_EVENTS = ["fireworks", "parade", "pride", "heist"] as const;
export type DevEvent = (typeof DEV_EVENTS)[number];

/** Dev panel skips, seconds added to each clock (0 outside development). */
const skew: Record<DevEvent, number> = {
  fireworks: 0,
  parade: 0,
  pride: 0,
  heist: 0,
};

/** A schedule's clock: real, or held by its URL flag, plus any dev skip.
 * `lead` is how far into its slot the held event starts (0: on the slot). */
function clockFor(flag: DevEvent, every: number, lead = 0): () => number {
  const preview = Number(
    new URLSearchParams(window.location.search).get(flag) ?? Number.NaN,
  );
  if (!Number.isFinite(preview)) return () => wallSeconds() + skew[flag];
  const held = heldClock(every, lead + preview);
  return () => held.read() + skew[flag];
}

/** The fireworks clock (`?fireworks=20` holds it 20 s into a show). */
export const showClock = clockFor("fireworks", SHOW_EVERY);
/** The parade clock (`?parade=20` holds it 20 s into a parade). */
export const paradeClock = clockFor("parade", PARADE_EVERY);
/** The clubs' Pride night clock (`?pride=20` holds it 20 s into one). */
export const prideClock = clockFor("pride", PRIDE_EVERY);
/** The heist clock (`?heist=20` holds it 20 s into slot 1000's heist). */
export const heistClock = clockFor("heist", HEIST_SLOT, heistOffset(1000));

/** Each event's clock and the seconds from a time to its next start. */
const CLOCKS: Record<
  DevEvent,
  { read: () => number; toNext: (t: number) => number }
> = {
  fireworks: { read: showClock, toNext: (t) => toNextStart(t, SHOW_EVERY) },
  parade: { read: paradeClock, toNext: (t) => toNextStart(t, PARADE_EVERY) },
  pride: { read: prideClock, toNext: (t) => toNextStart(t, PRIDE_EVERY) },
  heist: { read: heistClock, toNext: nextHeistIn },
};

/** Dev panel: skip an event's clock to the start of its next run. */
export function devStartEvent(event: DevEvent): void {
  const { read, toNext } = CLOCKS[event];
  skew[event] += toNext(read());
}

/** Dev panel skip for the club nights, ms. */
let nightSkew = 0;
const nightListeners = new Set<() => void>();

/** Calls `fn` whenever the dev panel moves the nights' clock. */
export function onNightSkip(fn: () => void): () => void {
  nightListeners.add(fn);
  return () => nightListeners.delete(fn);
}

/**
 * The club nights' clock, in epoch ms: the real time, or with
 * `?night=latin-night` (any CLUB_NIGHTS id) set an hour into that night's
 * next run, so a screenshot or a test can see it on any day of the week.
 */
export const nightClock: () => number = (() => {
  const id = new URLSearchParams(window.location.search).get("night");
  const row = schedule(Date.now()).find((r) => r.id === id);
  const offset = !row || row.on ? 0 : row.inMs + 3_600_000;
  return () => Date.now() + offset + nightSkew;
})();

/** Dev panel: skip the nights' clock a minute into `id`'s next run. */
export function devStartNight(id: string): void {
  const row = schedule(nightClock()).find((r) => r.id === id);
  if (!row || row.on) return;
  nightSkew += row.inMs + 60_000;
  for (const fn of nightListeners) fn();
}
