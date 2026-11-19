// Verifies that git-ignored scratch and tool directories are ignored by ESLint.
import assert from "node:assert/strict";
import { test } from "node:test";
import { ESLint } from "eslint";

test("ESLint ignores git-ignored asset, scratch and tool directories", async () => {
  const eslint = new ESLint();
  const samplePaths = [
    "local-assets/work-city-planner-checkpoint/src/game/city/dreamCosts.generated.ts",
    "recordings/run/session.ts",
    "test-map/client.spec.ts.json",
    ".tripo-home/credentials.json",
    ".playwright/trace.ts",
    ".playwright-mcp/debug.ts",
    ".playwright-cli/cmd.ts",
    "blob-report/index.html",
    ".venv/lib/python.ts",
  ];

  for (const path of samplePaths) {
    const ignored = await eslint.isPathIgnored(path);
    assert.equal(ignored, true, `Expected ${path} to be ignored by ESLint`);
  }
});
