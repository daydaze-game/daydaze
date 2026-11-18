// Tests for the docs-only change check that lets CI skip the browser suites.
import assert from "node:assert/strict";
import { test } from "node:test";
import { isDocsOnly } from "./docs-only.ts";

test("docs, editor config and Python scripts are docs-only", () => {
  assert.equal(
    isDocsOnly([
      "README.md",
      "docs/plans/x.md",
      ".vscode/settings.json",
      "art/a/b.py",
    ]),
    true,
  );
});

test("any source, asset or workflow file makes the change code", () => {
  assert.equal(isDocsOnly(["README.md", "src/client/App.tsx"]), false);
  assert.equal(isDocsOnly(["public/models/a.glb"]), false);
  assert.equal(isDocsOnly([".github/workflows/playwright.yml"]), false);
  assert.equal(isDocsOnly(["package.json"]), false);
});

test("an empty change is not docs-only, so the suites still run", () => {
  assert.equal(isDocsOnly([]), false);
  assert.equal(isDocsOnly(["", "  "]), false);
});
