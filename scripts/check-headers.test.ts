// Unit tests for the pure header detector in check-headers.ts.
import assert from "node:assert/strict";
import { test } from "node:test";
import { hasHeader } from "./check-headers.ts";

test("hasHeader accepts line and block comments", () => {
  assert.ok(hasHeader("// what this is\nconst a = 1;"));
  assert.ok(hasHeader("/* what this is */\nconst a = 1;"));
  assert.ok(hasHeader("/** doc */\nexport {};"));
});

test("hasHeader skips a shebang and BOM", () => {
  assert.ok(hasHeader("#!/usr/bin/env node\n// header\n"));
  assert.ok(hasHeader("﻿// header\n"));
});

test("hasHeader rejects code first and empty files", () => {
  assert.ok(!hasHeader("import x from 'y';\n// late comment"));
  assert.ok(!hasHeader("#!/usr/bin/env node\nconst a = 1;"));
  assert.ok(!hasHeader(""));
});
