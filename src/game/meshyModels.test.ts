// Every Meshy model the client loads by a hard-coded name has its GLB.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { MESHY_PROPS, meshyDir } from "./meshyModels.ts";
import { typedKeys } from "./typed.ts";

test("every named Meshy prop has a model file in its folder", () => {
  for (const name of typedKeys(MESHY_PROPS)) {
    assert.ok(
      existsSync(`public/models/${meshyDir(name)}/${name}.glb`),
      `${name}.glb`,
    );
  }
});

test("meshyDir is the folder the Prop helpers load from", () => {
  assert.equal(meshyDir("boodle"), "meshy/food");
  assert.equal(meshyDir("mango-crate"), "meshy/mango");
  assert.equal(meshyDir("jeepney"), "meshy/museum");
});
