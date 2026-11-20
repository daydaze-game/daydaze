// Fails (exit 1) when a git-tracked code file under src/, server/src/,
// scripts/ or tests/ doesn't start with a header comment (`//` or `/*`,
// after an optional shebang). `npm run lint:headers` runs it; `verify` and CI
// include it. The pure test is `hasHeader`, covered by check-headers.test.ts.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** True when `text` begins with a `//` or `/*` comment (after a shebang line). */
export function hasHeader(text: string): boolean {
  const body = text.replace(/^\uFEFF/, "").replace(/^#!.*\r?\n/, "");
  return /^\s*(\/\/|\/\*)/.test(body);
}

const SKIP = ["server/worker-configuration.d.ts"];

/** Tracked code files that must carry a header. */
export function trackedCodeFiles(): string[] {
  const out = execFileSync(
    "git",
    [
      "ls-files",
      "--",
      ...["src", "server/src", "scripts", "tests"].flatMap((d) =>
        ["ts", "tsx", "mjs", "js"].map((e) => `:(glob)${d}/**/*.${e}`),
      ),
    ],
    { encoding: "utf8" },
  );
  return out
    .split("\n")
    .filter((f) => f && !SKIP.includes(f) && !f.endsWith(".d.ts"));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const bad = trackedCodeFiles().filter(
    (f) => !hasHeader(readFileSync(f, "utf8")),
  );
  if (bad.length > 0) {
    console.error(`Missing header comment in ${bad.length} file(s):`);
    for (const f of bad) console.error(`  ${f}`);
    process.exit(1);
  }
  console.log("All code files have a header comment.");
}
