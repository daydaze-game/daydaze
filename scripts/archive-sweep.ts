// Copies every Actions artifact that cannot be rebuilt (screenshots,
// recordings, Playwright reports, profiles) into a permanent release on
// dpologdvinity/daydaze-artifacts before it expires. Builds (`dist`),
// coverage, screenshot shards and test maps come back from any commit, so
// they are left to expire. archive-sweep.yml runs it daily and by hand:
//
//   ARTIFACTS_TOKEN=... GH_TOKEN=... node --experimental-strip-types scripts/archive-sweep.ts
//
// One release per workflow run and kind, holding each artifact as its zip,
// tagged `<kind>-<branch>-<sha7>-<run>-sweep`. A run that already has a
// release of that kind (from here or from scripts/archive-run.sh) is skipped,
// so reruns resume where a timed-out sweep stopped.

import { execFileSync } from "node:child_process";
import { mkdtempSync, openSync, closeSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** The fields of a GitHub Actions artifact the sweep reads. */
export interface Artifact {
  id: number;
  name: string;
  expired: boolean;
  created_at: string;
  expires_at: string;
  workflow_run: {
    id: number;
    head_branch: string | null;
    head_sha: string;
  } | null;
}

/** One release to create: a run's artifacts of one kind. */
export interface Batch {
  tag: string;
  kind: string;
  runId: number;
  branch: string;
  sha: string;
  expiresAt: string;
  artifacts: { id: number; name: string; file: string }[];
}

/** Artifacts younger than this may belong to a run that is still going. */
const SETTLE_MS = 6 * 60 * 60 * 1000;

/** The release kind an artifact is archived under, or null to let it expire. */
export function kindOf(name: string): string | null {
  if (name === "screenshots" || name === "recording" || name === "profile")
    return name;
  if (name === "browser-test-results" || name.startsWith("playwright-report")) {
    return "test-results";
  }
  return null;
}

function slug(ref: string): string {
  return ref.replace(/[^A-Za-z0-9._-]/g, "-");
}

/** The releases to create, soonest-expiring first, for artifacts not yet archived. */
export function plan(
  artifacts: readonly Artifact[],
  tags: readonly string[],
  now: Date,
): Batch[] {
  const batches = new Map<string, Batch>();
  for (const a of artifacts) {
    const kind = kindOf(a.name);
    const run = a.workflow_run;
    if (a.expired || !kind || !run) continue;
    if (now.getTime() - Date.parse(a.created_at) < SETTLE_MS) continue;
    // archive-run.sh tags end in -<run>-<attempt>, the sweep's in -<run>-sweep
    if (tags.some((t) => t.startsWith(`${kind}-`) && t.includes(`-${run.id}-`)))
      continue;
    const key = `${kind} ${run.id}`;
    let batch = batches.get(key);
    if (!batch) {
      const branch = run.head_branch ?? "unknown";
      batch = {
        tag: `${kind}-${slug(branch)}-${run.head_sha.slice(0, 7)}-${run.id}-sweep`,
        kind,
        runId: run.id,
        branch,
        sha: run.head_sha,
        expiresAt: a.expires_at,
        artifacts: [],
      };
      batches.set(key, batch);
    }
    // reruns can upload the same name twice in one run; asset names must differ
    const taken = batch.artifacts.some((x) => x.file === `${a.name}.zip`);
    batch.artifacts.push({
      id: a.id,
      name: a.name,
      file: taken ? `${a.name}-${a.id}.zip` : `${a.name}.zip`,
    });
    if (a.expires_at < batch.expiresAt) batch.expiresAt = a.expires_at;
  }
  return [...batches.values()].sort((x, y) =>
    x.expiresAt.localeCompare(y.expiresAt),
  );
}

/** Narrows one line of the artifacts API to an Artifact, or null when it does not fit. */
function toArtifact(value: unknown): Artifact | null {
  if (typeof value !== "object" || value === null) return null;
  const v: Record<string, unknown> = { ...value };
  const run: unknown = v.workflow_run;
  let workflowRun: Artifact["workflow_run"] = null;
  if (typeof run === "object" && run !== null) {
    const r: Record<string, unknown> = { ...run };
    if (typeof r.id !== "number" || typeof r.head_sha !== "string") return null;
    workflowRun = {
      id: r.id,
      head_branch: typeof r.head_branch === "string" ? r.head_branch : null,
      head_sha: r.head_sha,
    };
  }
  if (
    typeof v.id !== "number" ||
    typeof v.name !== "string" ||
    typeof v.expired !== "boolean" ||
    typeof v.created_at !== "string" ||
    typeof v.expires_at !== "string"
  ) {
    return null;
  }
  return {
    id: v.id,
    name: v.name,
    expired: v.expired,
    created_at: v.created_at,
    expires_at: v.expires_at,
    workflow_run: workflowRun,
  };
}

function gh(args: string[], token?: string): string {
  const env = token ? { ...process.env, GH_TOKEN: token } : process.env;
  return execFileSync("gh", args, {
    encoding: "utf8",
    env,
    maxBuffer: 256 * 1024 * 1024,
  });
}

function main(): void {
  const token = process.env.ARTIFACTS_TOKEN;
  if (!token) throw new Error("ARTIFACTS_TOKEN is not set");
  const src = process.env.GITHUB_REPOSITORY ?? "dpologdvinity/daydaze";
  const dst = process.env.ARTIFACTS_REPO ?? "dpologdvinity/daydaze-artifacts";
  // GitHub allows about 500 content-creating requests an hour; each release
  // is one plus one per asset, so wait this long after every request
  const pace = Number(process.env.PACE_SECONDS ?? "8");
  const server = process.env.GITHUB_SERVER_URL ?? "https://github.com";

  const artifacts = gh([
    "api",
    `repos/${src}/actions/artifacts?per_page=100`,
    "--paginate",
    "--jq",
    ".artifacts[]",
  ])
    .split("\n")
    .filter(Boolean)
    .map((line) => toArtifact(JSON.parse(line)))
    .filter((a) => a !== null);
  const tags = gh(
    [
      "release",
      "list",
      "-R",
      dst,
      "--limit",
      "100000",
      "--json",
      "tagName",
      "--jq",
      ".[].tagName",
    ],
    token,
  )
    .split("\n")
    .filter(Boolean);
  const batches = plan(artifacts, tags, new Date());
  console.log(
    `${artifacts.length} live artifacts, ${batches.length} releases to create`,
  );

  let failed = 0;
  for (const [i, b] of batches.entries()) {
    const dir = mkdtempSync(join(tmpdir(), "sweep-"));
    try {
      const files = b.artifacts.map((a) => {
        const path = join(dir, a.file);
        const fd = openSync(path, "w");
        try {
          execFileSync(
            "gh",
            ["api", `repos/${src}/actions/artifacts/${a.id}/zip`],
            {
              stdio: ["ignore", fd, "inherit"],
            },
          );
        } finally {
          closeSync(fd);
        }
        return path;
      });
      const notes = [
        `Branch \`${b.branch}\` at ${server}/${src}/commit/${b.sha}`,
        `Run: ${server}/${src}/actions/runs/${b.runId}`,
        `Artifacts: ${b.artifacts.map((a) => a.name).join(", ")} (archived by scripts/archive-sweep.ts)`,
      ].join("\n");
      gh(
        [
          "release",
          "create",
          b.tag,
          ...files,
          "-R",
          dst,
          "--title",
          `${b.kind}: ${b.branch} at ${b.sha.slice(0, 7)} (run ${b.runId})`,
          "--notes",
          notes,
        ],
        token,
      );
      console.log(`[${i + 1}/${batches.length}] ${b.tag}`);
    } catch (err) {
      failed++;
      console.log(
        `::error::${b.tag}: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    execFileSync("sleep", [String(pace * (1 + b.artifacts.length))]);
  }
  if (failed > 0) {
    console.log(
      `::error::${failed} of ${batches.length} releases failed; the next sweep retries them`,
    );
    process.exitCode = 1;
  }
}

if (import.meta.main) main();
