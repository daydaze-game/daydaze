// Tests for picking which browser tests a pull request runs from the files it
// changed and the test map recorded on main (scripts/select-tests.ts).
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  grepFor,
  selectTests,
  specImportClosure,
  type TestMapEntry,
} from "./select-tests.ts";

const MAP: TestMapEntry[] = [
  {
    title: "Ramen Rush: a shift",
    files: [
      "src/client/App.tsx",
      "src/game/ramen.ts",
      "public/models/bowl.glb",
    ],
  },
  { title: "the zoo's gate", files: ["src/client/App.tsx", "src/game/zoo.ts"] },
  {
    title: "Lune: take a chair",
    files: ["src/client/App.tsx", "src/game/lune.ts"],
  },
  {
    title: "Vinyl Vault sells a record",
    files: ["src/client/App.tsx", "src/game/vinyl.ts"],
  },
];
const none = new Set<string>();

test("a change to files only some tests load runs just those tests", () => {
  assert.deepEqual(selectTests(["src/game/ramen.ts"], MAP, none), {
    kind: "some",
    titles: ["Ramen Rush: a shift"],
  });
  assert.deepEqual(
    selectTests(["src/game/zoo.ts", "public/models/bowl.glb"], MAP, none),
    {
      kind: "some",
      titles: ["Ramen Rush: a shift", "the zoo's gate"],
    },
  );
});

test("docs and unit tests alone run no browser tests", () => {
  assert.deepEqual(
    selectTests(["README.md", "src/game/ramen.test.ts"], MAP, none),
    {
      kind: "none",
    },
  );
  // the unit test is ignored, the module it tests still selects
  assert.deepEqual(
    selectTests(["src/game/ramen.test.ts", "src/game/ramen.ts"], MAP, none),
    {
      kind: "some",
      titles: ["Ramen Rush: a shift"],
    },
  );
});

test("anything the map cannot vouch for runs the full suite", () => {
  const all = (changed: string[], specImports = none) =>
    selectTests(changed, MAP, specImports).kind;
  assert.equal(selectTests(["src/game/ramen.ts"], [], none).kind, "all"); // no map yet
  assert.equal(all(["src/game/new-thing.ts"]), "all"); // no recorded test loaded it
  assert.equal(all(["package.json"]), "all"); // dependencies
  assert.equal(all(["tests/client.spec.ts"]), "all"); // the tests themselves
  assert.equal(all(["playwright.config.ts"]), "all");
  assert.equal(all(["index.html"]), "all");
  assert.equal(all(["src/game/ramen.ts", "vite.config.ts"]), "all");
  // a spec imports it directly, so its expectations can change with it
  assert.equal(
    all(["src/game/ramen.ts"], new Set(["src/game/ramen.ts"])),
    "all",
  );
});

test("a change most tests load runs the full suite instead of a long list", () => {
  assert.equal(selectTests(["src/client/App.tsx"], MAP, none).kind, "all");
});

test("grepFor matches each selected title literally", () => {
  const re = new RegExp(
    grepFor(["Ramen Rush: a shift", "the zoo's gate (1+1)"]),
  );
  assert.ok(re.test("Ramen Rush: a shift"));
  assert.ok(re.test("chromium › client.spec.ts › the zoo's gate (1+1)"));
  assert.ok(re.test("chromium › client.spec.ts › Ramen Rush: a shift @slow"));
  assert.ok(!re.test("Lune: take a chair"));
  // parentheses and plus signs are literal, not regex syntax
  assert.ok(!re.test("the zoo's gate 11"));
});

test("specImportClosure follows relative imports transitively", () => {
  const files: Record<string, string> = {
    "tests/client.spec.ts": `import { a } from "../src/game/a.ts";\nimport { x } from "@playwright/test";\nimport { d } from "./dock.ts";`,
    "tests/dock.ts": `export const d = 1;`,
    "src/game/a.ts": `import { b } from "./b.ts";\nexport { c } from "./sub/c.ts";`,
    "src/game/b.ts": `export const b = 1;`,
    "src/game/sub/c.ts": `export const c = 1;`,
  };
  const read = (p: string) => files[p];
  assert.deepEqual(
    [...specImportClosure(["tests/client.spec.ts"], read)].sort(),
    [
      "src/game/a.ts",
      "src/game/b.ts",
      "src/game/sub/c.ts",
      "tests/client.spec.ts",
      "tests/dock.ts",
    ],
  );
});
