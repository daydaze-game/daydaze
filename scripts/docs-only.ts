// Decides whether a change touches only files the browser suites cannot
// notice: docs, editor and lint config, Python scripts. The Tests workflow
// reads it from stdin to skip the slow Playwright steps on such a change:
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
