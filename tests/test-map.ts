// Records the test map scripts/select-tests.ts reads: for each browser test,
// the source modules and public assets it loaded. The Vite dev server serves
// every module as its own request and rooms load lazily, so the requests a
// test makes are the code it exercises. Only runs with RECORD_TEST_MAP=1 (the
// Tests workflow sets it on main); each worker appends JSON lines to
// test-map/<shard>-<worker>.jsonl.

import { appendFileSync, mkdirSync } from "node:fs";
import type { Browser, BrowserContext, test as base } from "@playwright/test";

/** The repo path a dev-server URL serves, or null for anything else. */
export function repoPath(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.hostname !== "localhost" && u.hostname !== "127.0.0.1") return null;
  const path = decodeURIComponent(u.pathname);
  if (path.startsWith("/src/")) return path.slice(1);
  // Vite internals and pre-bundled dependencies (package.json covers those)
  if (/^\/(@|node_modules\/|__)/.test(path)) return null;
  // anything else with a file extension is served from public/
  return /\.[a-z0-9]+$/i.test(path) ? `public${path}` : null;
}

/** Files the current test has loaded; reset before each test. */
let loaded = new Set<string>();
const watched = new WeakSet<BrowserContext>();
const patched = new WeakSet<Browser>();

function watch(context: BrowserContext) {
  if (watched.has(context)) return;
  watched.add(context);
  context.on("request", (r) => {
    const p = repoPath(r.url());
    if (p) loaded.add(p);
  });
}

/** Hooks the recorder into a spec's tests when RECORD_TEST_MAP=1. */
export function recordTestMap(test: typeof base) {
  if (process.env.RECORD_TEST_MAP !== "1") return;
  test.beforeEach(({ context, browser }) => {
    loaded = new Set();
    watch(context);
    // tests that open a context of their own (the walkthrough) count too
    if (!patched.has(browser)) {
      patched.add(browser);
      const newContext = browser.newContext.bind(browser);
      browser.newContext = async (...args) => {
        const c = await newContext(...args);
        watch(c);
        return c;
      };
    }
  });
  test.afterEach(() => {
    const info = test.info();
    mkdirSync("test-map", { recursive: true });
    const line = JSON.stringify({
      title: info.title,
      files: [...loaded].sort(),
    });
    appendFileSync(
      `test-map/${process.env.SHARD ?? "0"}-${info.workerIndex}.jsonl`,
      `${line}\n`,
    );
  });
}
