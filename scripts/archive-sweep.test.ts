// Tests for the artifact sweep's planning: which artifacts get archived, how
// they group into releases, and what counts as already archived.
import assert from "node:assert/strict";
import { test } from "node:test";
import { kindOf, plan, type Artifact } from "./archive-sweep.ts";

const NOW = new Date("2026-11-19T12:00:00Z");

function art(over: Partial<Artifact> & { id: number; name: string }): Artifact {
  return {
    expired: false,
    created_at: "2026-11-18T00:00:00Z",
    expires_at: "2026-11-25T00:00:00Z",
    workflow_run: { id: 900, head_branch: "feat/x", head_sha: "abcdef123456" },
    ...over,
  };
}

test("keeps what cannot be rebuilt and skips builds, coverage, shards and maps", () => {
  assert.equal(kindOf("screenshots"), "screenshots");
  assert.equal(kindOf("recording"), "recording");
  assert.equal(kindOf("profile"), "profile");
  assert.equal(kindOf("browser-test-results"), "test-results");
  assert.equal(kindOf("playwright-report-3"), "test-results");
  assert.equal(kindOf("playwright-report-online"), "test-results");
  for (const name of [
    "dist",
    "coverage",
    "shots-2",
    "test-map-1",
    "gitleaks-results.sarif",
  ]) {
    assert.equal(kindOf(name), null, name);
  }
});

test("groups a run's artifacts of one kind into one release, soonest to expire first", () => {
  const batches = plan(
    [
      art({ id: 1, name: "playwright-report-1" }),
      art({ id: 2, name: "playwright-report-2" }),
      art({ id: 3, name: "dist" }),
      art({
        id: 4,
        name: "screenshots",
        expires_at: "2026-11-20T00:00:00Z",
        workflow_run: {
          id: 901,
          head_branch: "main",
          head_sha: "1234567890ab",
        },
      }),
    ],
    [],
    NOW,
  );
  assert.deepEqual(
    batches.map((b) => [b.tag, b.artifacts.map((a) => a.file)]),
    [
      ["screenshots-main-1234567-901-sweep", ["screenshots.zip"]],
      [
        "test-results-feat-x-abcdef1-900-sweep",
        ["playwright-report-1.zip", "playwright-report-2.zip"],
      ],
    ],
  );
});

test("skips runs already archived by the sweep or by archive-run.sh", () => {
  const batches = plan(
    [
      art({ id: 1, name: "screenshots" }),
      art({
        id: 2,
        name: "profile",
        workflow_run: {
          id: 902,
          head_branch: "main",
          head_sha: "f".repeat(40),
        },
      }),
    ],
    ["screenshots-feat-x-abcdef1-900-2", "profile-main-fffffff-902-sweep"],
    NOW,
  );
  assert.deepEqual(batches, []);
});

test("skips expired, run-less and still-settling artifacts", () => {
  const batches = plan(
    [
      art({ id: 1, name: "screenshots", expired: true }),
      art({ id: 2, name: "screenshots", workflow_run: null }),
      art({ id: 3, name: "screenshots", created_at: "2026-11-19T10:00:00Z" }),
    ],
    [],
    NOW,
  );
  assert.deepEqual(batches, []);
});

test("a name repeated across reruns gets the artifact id, and odd branch names are slugged", () => {
  const run = { id: 903, head_branch: "fix/a b", head_sha: "0123456789ab" };
  const batches = plan(
    [
      art({ id: 7, name: "screenshots", workflow_run: run }),
      art({ id: 8, name: "screenshots", workflow_run: run }),
    ],
    [],
    NOW,
  );
  assert.equal(batches.length, 1);
  assert.equal(batches[0]?.tag, "screenshots-fix-a-b-0123456-903-sweep");
  assert.deepEqual(
    batches[0]?.artifacts.map((a) => a.file),
    ["screenshots.zip", "screenshots-8.zip"],
  );
});
