// Tests for scripts/check-coverage.ts: lcov parsing, per-directory totals and
// the minimum check, using small hand-written lcov reports.

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  checkMinimums,
  parseLcov,
  percent,
  totalsFor,
} from "./check-coverage.ts";

const LCOV = `TN:
SF:src/game/a.ts
FNF:4
FNH:3
LF:10
LH:9
BRF:6
BRH:3
end_of_record
SF:src/game/b.ts
FNF:2
FNH:2
LF:10
LH:10
BRF:0
BRH:0
end_of_record
SF:src/net/c.ts
FNF:1
FNH:0
LF:4
LH:2
BRF:2
BRH:2
end_of_record
`;

test("parseLcov reads the hit and found counts for each file", () => {
  const files = parseLcov(LCOV);
  assert.deepEqual(
    [...files.keys()],
    ["src/game/a.ts", "src/game/b.ts", "src/net/c.ts"],
  );
  assert.deepEqual(files.get("src/game/a.ts"), {
    lines: { hit: 9, found: 10 },
    branches: { hit: 3, found: 6 },
    functions: { hit: 3, found: 4 },
  });
});

test("totalsFor sums only the files under the directory prefix", () => {
  const total = totalsFor(parseLcov(LCOV), "src/game/");
  assert.deepEqual(total, {
    lines: { hit: 19, found: 20 },
    branches: { hit: 3, found: 6 },
    functions: { hit: 5, found: 6 },
  });
  assert.equal(totalsFor(parseLcov(LCOV), "src/missing/"), undefined);
});

test("percent treats an empty metric as fully covered", () => {
  assert.equal(percent(0, 0), 100);
  assert.equal(percent(1, 4), 25);
});

test("checkMinimums passes when every directory meets its floors", () => {
  const files = parseLcov(LCOV);
  assert.deepEqual(
    checkMinimums(files, {
      "src/game/": { lines: 95, branches: 50, functions: 80 },
      "src/net/": { lines: 50, branches: 100, functions: 0 },
    }),
    [],
  );
});

test("checkMinimums reports a directory that falls below a floor", () => {
  const failures = checkMinimums(parseLcov(LCOV), {
    "src/game/": { lines: 96, branches: 51, functions: 80 },
  });
  assert.deepEqual(failures, [
    "src/game/ lines 95.00% is below the 96% minimum",
    "src/game/ branches 50.00% is below the 51% minimum",
  ]);
});

test("checkMinimums fails a directory with no files in the report", () => {
  assert.deepEqual(
    checkMinimums(parseLcov(LCOV), {
      "src/gone/": { lines: 0, branches: 0, functions: 0 },
    }),
    ["src/gone/: no files in the coverage report"],
  );
});
