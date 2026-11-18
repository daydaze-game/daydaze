// Enforces per-directory coverage minimums for the game rules (src/game/) and
// the network protocol (src/net/), and fails (exit 1) when either drops below
// its floor. Node's native --test-coverage-* flags only apply to the whole
// project, so the directory floors are checked here, from the lcov report
// that `npm run test:coverage` writes to coverage/lcov.info.
//
// The floors sit a little under today's numbers so ordinary churn passes but a
// real drop fails. Raise them when coverage rises; see CONTRIBUTING.md.
//
//   npm run test:coverage   (writes coverage/lcov.info, then runs this check)
//   node --experimental-strip-types scripts/check-coverage.ts [lcov-path]

import { readFileSync } from "node:fs";

/** Line, branch and function percentages a directory must reach. */
export interface Minimums {
  lines: number;
  branches: number;
  functions: number;
}

/** Hit and found counts for one file or a group of files. */
export interface Counts {
  lines: { hit: number; found: number };
  branches: { hit: number; found: number };
  functions: { hit: number; found: number };
}

/** Directory prefix (repo-relative, with trailing slash) and its floors. */
export const MINIMUMS: Readonly<Record<string, Minimums>> = {
  "src/game/": { lines: 98, branches: 94, functions: 96 },
  "src/net/": { lines: 96, branches: 91, functions: 87 },
};

/** Per-file counts keyed by the repo-relative path from each `SF:` record. */
export function parseLcov(text: string): Map<string, Counts> {
  const files = new Map<string, Counts>();
  let current: Counts | undefined;
  for (const line of text.split("\n")) {
    if (line.startsWith("SF:")) {
      current = emptyCounts();
      files.set(line.slice(3).trim(), current);
      continue;
    }
    if (!current) continue;
    const m = /^(LF|LH|BRF|BRH|FNF|FNH):(\d+)$/.exec(line.trim());
    if (!m) continue;
    const value = Number(m[2]);
    switch (m[1]) {
      case "LF":
        current.lines.found = value;
        break;
      case "LH":
        current.lines.hit = value;
        break;
      case "BRF":
        current.branches.found = value;
        break;
      case "BRH":
        current.branches.hit = value;
        break;
      case "FNF":
        current.functions.found = value;
        break;
      case "FNH":
        current.functions.hit = value;
        break;
    }
  }
  return files;
}

/** Sums the counts of every file whose path starts with the prefix. */
export function totalsFor(
  files: ReadonlyMap<string, Counts>,
  prefix: string,
): Counts | undefined {
  let total: Counts | undefined;
  for (const [path, c] of files) {
    if (!path.startsWith(prefix)) continue;
    total ??= emptyCounts();
    for (const k of ["lines", "branches", "functions"] as const) {
      total[k].hit += c[k].hit;
      total[k].found += c[k].found;
    }
  }
  return total;
}

/** Percent covered; an empty metric (nothing to cover) counts as complete. */
export function percent(hit: number, found: number): number {
  return found === 0 ? 100 : (100 * hit) / found;
}

/**
 * Compares each directory's totals with its floors. Returns one message per
 * failure; an empty list means every directory passes. A directory with no
 * files in the report is a failure, so a renamed folder cannot slip through.
 */
export function checkMinimums(
  files: ReadonlyMap<string, Counts>,
  minimums: Readonly<Record<string, Minimums>>,
): string[] {
  const failures: string[] = [];
  for (const [prefix, floor] of Object.entries(minimums)) {
    const total = totalsFor(files, prefix);
    if (!total) {
      failures.push(`${prefix}: no files in the coverage report`);
      continue;
    }
    for (const k of ["lines", "branches", "functions"] as const) {
      const got = percent(total[k].hit, total[k].found);
      if (got < floor[k])
        failures.push(
          `${prefix} ${k} ${got.toFixed(2)}% is below the ${floor[k]}% minimum`,
        );
    }
  }
  return failures;
}

function emptyCounts(): Counts {
  return {
    lines: { hit: 0, found: 0 },
    branches: { hit: 0, found: 0 },
    functions: { hit: 0, found: 0 },
  };
}

if (import.meta.main) {
  const path = process.argv[2] ?? "coverage/lcov.info";
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (err) {
    console.error(`Cannot read ${path}: ${String(err)}`);
    process.exit(1);
  }
  const files = parseLcov(text);
  for (const prefix of Object.keys(MINIMUMS)) {
    const total = totalsFor(files, prefix);
    if (!total) continue;
    const f = (k: keyof Counts) =>
      `${percent(total[k].hit, total[k].found).toFixed(2)}%`;
    console.log(
      `${prefix} lines ${f("lines")} branches ${f("branches")} functions ${f("functions")}`,
    );
  }
  const failures = checkMinimums(files, MINIMUMS);
  if (failures.length > 0) {
    console.error("Coverage below the minimums:");
    for (const msg of failures) console.error(`  ${msg}`);
    process.exit(1);
  }
  console.log("Coverage meets the per-directory minimums.");
}
