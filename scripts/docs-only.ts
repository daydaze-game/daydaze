// Decides whether a change touches only files the browser suites cannot
// notice: docs, editor, lint and agent config, scripts, Blender sources and
// workflows other than the suites' own. server/ is not on the list: the client
// imports server/src/chatFilter.ts. The Tests workflow reads it from stdin to
// skip the slow Playwright steps on such a change:
//
//   git diff --name-only origin/main...HEAD | node --experimental-strip-types scripts/docs-only.ts
//
// It prints "true" or "false". It is an allowlist, so any unknown path counts
// as code and the suites run.

import { readFileSync } from "node:fs";

/** Paths no browser test can depend on. Anything else is treated as code. */
const DOCS_ONLY: readonly RegExp[] = [
  /\.md$/,
  /^docs\//,
  /^\.vscode\//,
  /^\.github\/(ISSUE_TEMPLATE\/|pull_request_template\.md$|dependabot\.yml$)/,
  /^\.(gitattributes|git-blame-ignore-revs|npmrc|editorconfig|prettierignore|gitignore|gitleaks\.toml|lychee\.toml|markdownlint-cli2\.jsonc)$/,
  /^(LICENSE|NOTICE|COPYING)(\..+)?$/,
  /^(cspell\.config\.yaml|cspell-words\.txt|ruff\.toml)$/,
  /\.py$/,
  // every workflow except the browser suites' own (playwright.yml)
  /^\.github\/workflows\/(?!playwright\.yml$)/,
  // repo scripts and Blender sources: neither the client nor the suites import
  // or run them (the dev server runs no build hooks)
  /^scripts\//,
  /^art\//,
  // lint, hook and agent config
  /^(eslint\.config\.mjs|knip\.jsonc|lefthook\.yml|\.dependency-cruiser\.cjs|opencode\.json|\.mcp\.json)$/,
  /^\.(agents|claude|codex)\//,
];

/** True when every changed file is on the allowlist (an empty change is not docs-only). */
export function isDocsOnly(files: readonly string[]): boolean {
  const changed = files.map((f) => f.trim()).filter(Boolean);
  return (
    changed.length > 0 &&
    changed.every((f) => DOCS_ONLY.some((re) => re.test(f)))
  );
}

if (import.meta.main) {
  console.log(String(isDocsOnly(readFileSync(0, "utf8").split("\n"))));
}
