// Time trials: a best time per runner per route, the route record, and the
// ghost of each best run to race against. Pure reducers over plain data.

export type GhostSample = { t: number; x: number; z: number; yaw: number };
export type TrialRun = { timeMs: number; ghost: readonly GhostSample[] };
/** routes[routeId][runnerId] is that runner's best. */
export type TrialBook = {
  routes: Readonly<Record<string, Readonly<Record<string, TrialRun>>>>;
};

export const MAX_GHOST_SAMPLES = 600;
/** XP per run (feeds Street). Bonuses stack on `finish`. */
export const TRIAL_XP = {
  finish: 10,
  personalBest: 15,
  routeRecord: 25,
} as const;

export type SubmitResult =
  | { ok: true; book: TrialBook; personalBest: boolean; routeRecord: boolean }
  | { ok: false; reason: "bad-time" };

export function newTrialBook(): TrialBook {
  return { routes: {} };
}

export function personalBest(
  book: TrialBook,
  routeId: string,
  runner: string,
): TrialRun | undefined {
  // own keys only: a runner or route named "toString" has no inherited best
  const route = Object.hasOwn(book.routes, routeId)
    ? book.routes[routeId]
    : undefined;
  return route && Object.hasOwn(route, runner) ? route[runner] : undefined;
}

/** The fastest run on a route; ties go to the runner id that sorts first. */
export function routeRecord(
  book: TrialBook,
  routeId: string,
): { runner: string; run: TrialRun } | undefined {
  let best: { runner: string; run: TrialRun } | undefined;
  const route = Object.hasOwn(book.routes, routeId)
    ? book.routes[routeId]
    : undefined;
  for (const [runner, run] of Object.entries(route ?? {})) {
    if (
      !best ||
      run.timeMs < best.run.timeMs ||
      (run.timeMs === best.run.timeMs && runner < best.runner)
    ) {
      best = { runner, run };
    }
  }
  return best;
}

function downsample(ghost: readonly GhostSample[]): GhostSample[] {
  // copies, so the caller keeps no handle on the stored replay, in time order
  // because ghostAt reads the first and last samples as its bounds
  const clean = ghost
    .filter(
      (s) =>
        Number.isFinite(s.t) &&
        Number.isFinite(s.x) &&
        Number.isFinite(s.z) &&
        Number.isFinite(s.yaw),
    )
    .map(({ t, x, z, yaw }) => ({ t, x, z, yaw }))
    .sort((a, b) => a.t - b.t);
  if (clean.length <= MAX_GHOST_SAMPLES) return clean;
  const out: GhostSample[] = [];
  for (let i = 0; i < MAX_GHOST_SAMPLES; i++) {
    const at = Math.round((i * (clean.length - 1)) / (MAX_GHOST_SAMPLES - 1));
    const s = clean[at];
    if (s) out.push(s);
  }
  return out;
}

/** Records a finished run. Only a strictly faster time replaces the runner's best. */
export function submitRun(
  book: TrialBook,
  routeId: string,
  runner: string,
  timeMs: number,
  ghost: readonly GhostSample[] = [],
): SubmitResult {
  if (!Number.isFinite(timeMs) || timeMs <= 0)
    return { ok: false, reason: "bad-time" };
  const before = routeRecord(book, routeId);
  const mine = personalBest(book, routeId, runner);
  const isBest = !mine || timeMs < mine.timeMs;
  if (!isBest)
    return { ok: true, book, personalBest: false, routeRecord: false };
  const next: TrialBook = {
    routes: {
      ...book.routes,
      [routeId]: {
        ...book.routes[routeId],
        [runner]: { timeMs, ghost: downsample(ghost) },
      },
    },
  };
  return {
    ok: true,
    book: next,
    personalBest: true,
    routeRecord: !before || timeMs < before.run.timeMs,
  };
}

/** Where a ghost is at `t` ms into its run: linear in position, shortest arc in yaw. */
export function ghostAt(
  ghost: readonly GhostSample[],
  t: number,
): GhostSample | null {
  const first = ghost[0];
  const last = ghost[ghost.length - 1];
  if (!first || !last) return null;
  if (t <= first.t) return first;
  if (t >= last.t) return last;
  for (let i = 1; i < ghost.length; i++) {
    const b = ghost[i];
    const a = ghost[i - 1];
    if (!a || !b || t > b.t) continue;
    const k = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
    const yawStep = Math.atan2(
      Math.sin(b.yaw - a.yaw),
      Math.cos(b.yaw - a.yaw),
    );
    return {
      t,
      x: a.x + (b.x - a.x) * k,
      z: a.z + (b.z - a.z) * k,
      yaw: a.yaw + yawStep * k,
    };
  }
  return last;
}

export function trialXp(r: {
  personalBest: boolean;
  routeRecord: boolean;
}): number {
  return (
    TRIAL_XP.finish +
    (r.personalBest ? TRIAL_XP.personalBest : 0) +
    (r.routeRecord ? TRIAL_XP.routeRecord : 0)
  );
}
