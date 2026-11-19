// Every package that src/ imports by bare name must be declared in package.json.
// An undeclared import only resolves while another package happens to hoist it
// (npm warns of nothing), so a local node_modules can lack it while CI has it.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { builtinModules } from "node:module";
import { join } from "node:path";
import { test } from "node:test";
import pkg from "../package.json" with { type: "json" };

/** Module specifier of `import x from "m"`, a multi-line import's closing `} from "m"`, or `import "m"`. */
const SPECIFIER =
  /^(?:(?:import|export|\})[^"'\n]*\bfrom|import)\s*["']([^"']+)["']/gm;

/** Every .ts/.tsx file under `dir`. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

/** `@scope/pkg/sub` -> `@scope/pkg`, `pkg/sub` -> `pkg`. */
function packageName(specifier: string): string {
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

test("src/ imports only packages declared in package.json", () => {
  const declared = new Set([
    ...Object.keys(pkg.dependencies),
    ...Object.keys(pkg.devDependencies),
  ]);
  const missing = new Set<string>();
  for (const file of sourceFiles("src")) {
    for (const [, specifier] of readFileSync(file, "utf8").matchAll(
      SPECIFIER,
    )) {
      if (/^[./]|^node:|^@\//.test(specifier)) continue; // relative, builtin or alias
      const name = packageName(specifier);
      if (!builtinModules.includes(name) && !declared.has(name)) {
        missing.add(`${name} (${file})`);
      }
    }
  }
  assert.deepEqual([...missing], []);
});
