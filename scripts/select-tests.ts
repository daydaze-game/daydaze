// Picks which browser tests (tests/client.spec.ts, tests/dream-city.spec.ts)
// a pull request runs, from the files it changed and the test map: the source
// modules and public assets each test loaded, recorded by tests/test-map.ts on
// main's full runs. The Tests workflow pipes the PR's changed files in:
//
//   gh pr diff 12 --name-only | node --experimental-strip-types scripts/select-tests.ts <map-dir>
//
// It prints "all", "none", or a regular expression for Playwright's grep
// (PW_GREP in playwright.config.ts). Anything the map can't vouch for runs the
// full suite: no map, a changed file outside src/ and public/, a file no
// recorded test loaded, a file a spec imports itself. main always runs the
// full suite, so a test a selection misses still fails right after the merge.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { isDocsOnly } from "./docs-only.ts";

/** One recorded test: its title and the repo paths it loaded. */
export interface TestMapEntry {
  title: string;
  files: string[];
}

export type Selection =
  | { kind: "all"; reason: string }
  | { kind: "none" }
  | { kind: "some"; titles: string[] };

/** Past this share of the suite a selection saves little; run everything. */
const MOST = 0.7;

/** The tests a change needs, given the map and the files the specs import. */
export function selectTests(
  changed: readonly string[],
  map: readonly TestMapEntry[],
  specImports: ReadonlySet<string>,
): Selection {
  if (map.length === 0) return { kind: "all", reason: "no test map" };
  const relevant = changed
    .map((f) => f.trim())
    .filter(Boolean)
    // docs and config the browser can't see, and Node unit tests
    .filter((f) => !isDocsOnly([f]) && !/\.test\.tsx?$/.test(f));
  if (relevant.length === 0) return { kind: "none" };
  const titles = new Set<string>();
  for (const f of relevant) {
    if (specImports.has(f))
      return { kind: "all", reason: `${f} is imported by a spec` };
    if (!f.startsWith("src/") && !f.startsWith("public/"))
      return { kind: "all", reason: `${f} is not game code` };
    const users = map.filter((t) => t.files.includes(f));
    if (users.length === 0)
      return { kind: "all", reason: `no recorded test loaded ${f}` };
    for (const t of users) titles.add(t.title);
  }
  if (titles.size > map.length * MOST)
    return {
      kind: "all",
      reason: `${titles.size} of ${map.length} tests use it`,
    };
  return { kind: "some", titles: [...titles].sort() };
}

/** A grep pattern matching each title literally. Not anchored: Playwright may
 * append tags to the title it matches, and a longer title that contains a
 * selected one only adds a test. */
export function grepFor(titles: readonly string[]): string {
  return titles.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
}

/** Every repo file the entry files import, following relative imports. */
export function specImportClosure(
  entries: readonly string[],
  read: (path: string) => string | undefined,
): Set<string> {
  const seen = new Set<string>();
  const queue = [...entries];
  for (let file = queue.pop(); file !== undefined; file = queue.pop()) {
    if (seen.has(file)) continue;
    const text = read(file);
    if (text === undefined) continue;
    seen.add(file);
    for (const m of text.matchAll(
      /(?:from|import)\s*\(?\s*["'](\.{1,2}\/[^"']+)["']/g,
    )) {
      queue.push(normalize(join(dirname(file), m[1])));
    }
  }
  return seen;
}

/** True for a parsed line of the map's JSONL. */
function isEntry(v: unknown): v is TestMapEntry {
  if (typeof v !== "object" || v === null) return false;
  const title: unknown = Reflect.get(v, "title");
  const files: unknown = Reflect.get(v, "files");
  return (
    typeof title === "string" &&
    Array.isArray(files) &&
    files.every((f) => typeof f === "string")
  );
}

/** Reads every *.jsonl under dir; the same title from two shards merges. */
function readMap(dir: string): TestMapEntry[] {
  if (!existsSync(dir)) return [];
  const byTitle = new Map<string, Set<string>>();
  for (const name of readdirSync(dir, { recursive: true, encoding: "utf8" })) {
    if (!name.endsWith(".jsonl")) continue;
    for (const line of readFileSync(join(dir, name), "utf8").split("\n")) {
      if (!line.trim()) continue;
      const parsed: unknown = JSON.parse(line);
      if (!isEntry(parsed)) continue;
      const files = byTitle.get(parsed.title) ?? new Set<string>();
      for (const f of parsed.files) files.add(f);
      byTitle.set(parsed.title, files);
    }
  }
  return [...byTitle].map(([title, files]) => ({ title, files: [...files] }));
}

if (import.meta.main) {
  const changed = readFileSync(0, "utf8").split("\n");
  const specs = readdirSync("tests")
    .filter((f) => f.endsWith(".spec.ts"))
    .map((f) => `tests/${f}`);
  const read = (p: string) =>
    existsSync(p) ? readFileSync(p, "utf8") : undefined;
  const pick = selectTests(
    changed,
    readMap(process.argv[2] ?? "test-map"),
    specImportClosure(specs, read),
  );
  if (pick.kind === "all")
    console.error(`select-tests: full suite (${pick.reason})`);
  if (pick.kind === "some")
    console.error(
      `select-tests: ${pick.titles.length} tests\n  ${pick.titles.join("\n  ")}`,
    );
  console.log(pick.kind === "some" ? grepFor(pick.titles) : pick.kind);
}
