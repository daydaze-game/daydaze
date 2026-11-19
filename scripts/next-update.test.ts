// Tests for picking the one auto-merge PR to bring up to date with main
// (scripts/next-update.ts, run by .github/workflows/auto-update.yml).
import assert from "node:assert/strict";
import { test } from "node:test";
import { nextUpdate, type OpenPr } from "./next-update.ts";

const pass = {
  __typename: "CheckRun",
  status: "COMPLETED",
  conclusion: "SUCCESS",
};
const running = {
  __typename: "CheckRun",
  status: "IN_PROGRESS",
  conclusion: null,
};
const failed = {
  __typename: "CheckRun",
  status: "COMPLETED",
  conclusion: "FAILURE",
};

function pr(
  n: number,
  state: string,
  checks: object[] = [pass],
  extra: Partial<OpenPr> = {},
): OpenPr {
  return {
    number: n,
    createdAt: `2026-11-19T0${n}:00:00Z`,
    isDraft: false,
    autoMergeRequest: { enabledAt: "x" },
    mergeStateStatus: state,
    statusCheckRollup: checks,
    ...extra,
  };
}

test("the oldest auto-merge PR that is behind gets updated", () => {
  assert.equal(
    nextUpdate([pr(3, "BEHIND"), pr(1, "BEHIND"), pr(2, "BEHIND")]),
    1,
  );
});

test("one PR at a time: an up-to-date PR still running checks holds the line", () => {
  assert.equal(
    nextUpdate([pr(1, "BLOCKED", [pass, running]), pr(2, "BEHIND")]),
    null,
  );
  // a clean one is about to be merged by GitHub; wait for it
  assert.equal(nextUpdate([pr(1, "CLEAN"), pr(2, "BEHIND")]), null);
});

test("failing, conflicted, draft and not-opted-in PRs neither block nor get updated", () => {
  assert.equal(
    nextUpdate([
      pr(1, "BLOCKED", [failed]),
      pr(2, "BEHIND", [failed]),
      pr(3, "DIRTY"),
      pr(4, "BEHIND", [pass], { isDraft: true }),
      pr(5, "BEHIND", [pass], { autoMergeRequest: null }),
      pr(6, "BEHIND"),
    ]),
    6,
  );
});

test("status contexts count like check runs", () => {
  const ctxPending = { __typename: "StatusContext", state: "PENDING" };
  const ctxError = { __typename: "StatusContext", state: "ERROR" };
  assert.equal(
    nextUpdate([pr(1, "BLOCKED", [ctxPending]), pr(2, "BEHIND")]),
    null,
  );
  assert.equal(nextUpdate([pr(1, "BEHIND", [ctxError]), pr(2, "BEHIND")]), 2);
});

test("an up-to-date PR stuck with nothing running doesn't hold the line", () => {
  // e.g. a required check that never reported
  assert.equal(nextUpdate([pr(1, "BLOCKED", [pass]), pr(2, "BEHIND")]), 2);
});

test("when every PR is UNKNOWN, lookupStatus resolves their real merge states", () => {
  const lookup = (n: number) =>
    n === 2 ? "BEHIND" : n === 1 ? "CLEAN" : "UNKNOWN";
  // PR 1 is CLEAN (in-flight/about to merge), so PR 2 waits
  assert.equal(nextUpdate([pr(1, "UNKNOWN"), pr(2, "UNKNOWN")], lookup), null);
  // When PR 1 has merged and only PR 2 and PR 3 remain UNKNOWN, both behind:
  const lookupBehind = (n: number) =>
    n === 2 || n === 3 ? "BEHIND" : "UNKNOWN";
  assert.equal(
    nextUpdate([pr(3, "UNKNOWN"), pr(2, "UNKNOWN")], lookupBehind),
    2,
  );
});

test("an UNKNOWN PR whose real state is DIRTY gets skipped after lookup", () => {
  const lookup = (n: number) => (n === 1 ? "DIRTY" : "BEHIND");
  assert.equal(nextUpdate([pr(1, "UNKNOWN"), pr(2, "UNKNOWN")], lookup), 2);
});

test("an unresolved UNKNOWN PR does not hold the line as in-flight", () => {
  // without lookup or when lookup returns UNKNOWN, checks running on an UNKNOWN PR do not block the queue
  assert.equal(
    nextUpdate([pr(1, "UNKNOWN", [pass, running]), pr(2, "BEHIND")]),
    2,
  );
});

test("nothing to do returns null", () => {
  assert.equal(nextUpdate([]), null);
  assert.equal(nextUpdate([pr(1, "BLOCKED", [failed])]), null);
});
