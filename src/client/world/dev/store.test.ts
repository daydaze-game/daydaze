// The dev panel's remembered prefs: well-formed fields load, anything else
// (bad JSON, wrong types, a broken position) falls back to the defaults.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePrefs } from "./store.ts";

test("parsePrefs keeps well-formed fields", () => {
  const p = parsePrefs(
    JSON.stringify({
      open: true,
      wireframe: true,
      closed: ["go"],
      at: [10, 20],
    }),
  );
  assert.equal(p.open, true);
  assert.equal(p.wireframe, true);
  assert.equal(p.freeCam, false);
  assert.deepEqual(p.closed, ["go"]);
  assert.deepEqual(p.at, [10, 20]);
});

test("parsePrefs drops malformed fields and bad JSON", () => {
  const p = parsePrefs(
    JSON.stringify({ open: "yes", closed: ["go", 3], at: [1, "x"] }),
  );
  assert.equal(p.open, false);
  assert.deepEqual(p.closed, ["go"]);
  assert.equal(p.at, null);
  assert.equal(parsePrefs("{nope").open, false);
  assert.equal(parsePrefs(null).at, null);
  assert.equal(parsePrefs("null").open, false);
});
