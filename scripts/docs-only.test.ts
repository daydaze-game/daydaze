// Tests for the docs-only change check that lets CI skip the browser suites.
import assert from "node:assert/strict";
import { test } from "node:test";
import { isDocsOnly } from "./docs-only.ts";

test("docs, editor config, legal text and Python scripts are docs-only", () => {
  assert.equal(
    isDocsOnly([
      "README.md",
      "docs/plans/x.md",
      ".vscode/settings.json",
      "art/a/b.py",
      "LICENSE",
      "NOTICE",
      ".gitleaks.toml",
      ".lychee.toml",
      ".git-blame-ignore-revs",
    ]),
    true,
  );
});

test("workflows other than the browser suites' own, scripts, art and tool config skip the suites", () => {
  assert.equal(
    isDocsOnly([
      ".github/workflows/ci.yml",
      ".github/workflows/autofix.yml",
      "scripts/land.sh",
      "scripts/record.ts",
      "art/doll/blender/build_doll.py",
      "art/doll/textures/skin.png",
      "eslint.config.mjs",
      "knip.jsonc",
      "lefthook.yml",
      ".dependency-cruiser.cjs",
      ".agents/skills/x/SKILL.md",
      ".claude/settings.json",
      ".codex/config.toml",
      "opencode.json",
      ".coderabbit.yaml",
      ".mcp.json",
    ]),
    true,
  );
});

test("any source, asset or workflow file makes the change code", () => {
  assert.equal(isDocsOnly(["README.md", "src/client/App.tsx"]), false);
  assert.equal(isDocsOnly(["public/models/a.glb"]), false);
  assert.equal(isDocsOnly([".github/workflows/playwright.yml"]), false);
  assert.equal(isDocsOnly(["package.json"]), false);
  // the client imports server/src/chatFilter.ts, so server code can break the suites
  assert.equal(isDocsOnly(["server/src/chatFilter.ts"]), false);
  assert.equal(isDocsOnly(["tests/client.spec.ts"]), false);
  assert.equal(isDocsOnly(["playwright.config.ts"]), false);
  assert.equal(isDocsOnly(["vite.config.ts"]), false);
  assert.equal(isDocsOnly(["tsconfig.json"]), false);
});

test("an empty change is not docs-only, so the suites still run", () => {
  assert.equal(isDocsOnly([]), false);
  assert.equal(isDocsOnly(["", "  "]), false);
});
