// Picks the one auto-merge pull request to bring up to date with main next.
// main requires PRs to be up to date and green before GitHub's auto-merge
// merges them, but nothing updates a PR by itself on a personal repo; the
// auto-update workflow does, one PR at a time so CI isn't flooded:
//
//   gh pr list --json number,createdAt,isDraft,autoMergeRequest,mergeStateStatus,statusCheckRollup \
//     | node --experimental-strip-types scripts/next-update.ts
//
// It prints a PR number, or nothing when the line should wait: an
// up-to-date PR is still running checks (it merges next), or none is behind.
// PRs with a failing check or a conflict are skipped, so they can't block it.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

/** The fields of `gh pr list --json` this reads. */
export interface OpenPr {
  number: number;
  createdAt: string;
  isDraft: boolean;
  autoMergeRequest: object | null;
  mergeStateStatus: string;
  statusCheckRollup: object[];
}

export type LookupStatus = (prNumber: number) => string;

const FAILED = new Set([
  "FAILURE",
  "CANCELLED",
  "TIMED_OUT",
  "ACTION_REQUIRED",
  "STARTUP_FAILURE",
  "ERROR",
]);

/** A check run's conclusion, or a status context's state. */
function outcome(check: object): { done: boolean; failed: boolean } {
  const status: unknown = Reflect.get(check, "status");
  const conclusion: unknown = Reflect.get(check, "conclusion");
  const state: unknown = Reflect.get(check, "state");
  if (typeof state === "string")
    return {
      done: state !== "PENDING" && state !== "EXPECTED",
      failed: FAILED.has(state),
    };
  return {
    done: status === "COMPLETED",
    failed: typeof conclusion === "string" && FAILED.has(conclusion),
  };
}

/** Fetches the fresh mergeStateStatus for a PR, retrying if still UNKNOWN. */
export function fetchMergeStateStatus(prNumber: number): string {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const out = execFileSync(
        "gh",
        [
          "pr",
          "view",
          String(prNumber),
          "--json",
          "mergeStateStatus",
          "-q",
          ".mergeStateStatus",
        ],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      ).trim();
      if (out && out !== "UNKNOWN") return out;
    } catch {
      // transient lookup failure, retry
    }
    if (attempt < 2) {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
    }
  }
  return "UNKNOWN";
}

/** The PR to update now, or null to wait. */
export function nextUpdate(
  prs: readonly OpenPr[],
  lookupStatus?: LookupStatus,
): number | null {
  const line = prs
    .filter(
      (p) =>
        p.autoMergeRequest !== null &&
        !p.isDraft &&
        p.mergeStateStatus !== "DIRTY",
    )
    .filter((p) => !p.statusCheckRollup.some((c) => outcome(c).failed))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const resolved = line
    .map((p) => {
      let status = p.mergeStateStatus;
      if (status === "UNKNOWN" && lookupStatus) {
        status = lookupStatus(p.number);
      }
      return { ...p, mergeStateStatus: status };
    })
    .filter((p) => p.mergeStateStatus !== "DIRTY");

  // an up-to-date PR still running checks, or clean and about to merge, goes
  // first; an up-to-date one stuck with nothing running doesn't hold the line.
  // An UNKNOWN PR does not hold the line because its merge state is unknown.
  const inFlight = resolved.some(
    (p) =>
      p.mergeStateStatus === "CLEAN" ||
      (p.mergeStateStatus !== "BEHIND" &&
        p.mergeStateStatus !== "UNKNOWN" &&
        p.statusCheckRollup.some((c) => !outcome(c).done)),
  );
  if (inFlight) return null;
  return resolved.find((p) => p.mergeStateStatus === "BEHIND")?.number ?? null;
}

/** True for one parsed `gh pr list` entry. */
function isOpenPr(v: unknown): v is OpenPr {
  if (typeof v !== "object" || v === null) return false;
  const rollup: unknown = Reflect.get(v, "statusCheckRollup");
  return (
    typeof Reflect.get(v, "number") === "number" &&
    typeof Reflect.get(v, "createdAt") === "string" &&
    typeof Reflect.get(v, "mergeStateStatus") === "string" &&
    Array.isArray(rollup)
  );
}

if (import.meta.main) {
  const parsed: unknown = JSON.parse(readFileSync(0, "utf8"));
  const prs = Array.isArray(parsed) ? parsed.filter(isOpenPr) : [];
  const n = nextUpdate(prs, fetchMergeStateStatus);
  if (n !== null) console.log(n);
}
