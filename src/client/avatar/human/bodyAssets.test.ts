// Verify that rebuilt dolls expose the editor's actual controls and load in a
// neutral state, before runtime effects select clothing and facial morphs.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { readGlb } from "../../../../scripts/pruneMorphs.ts";
import { FACE_SLIDERS } from "../../../game/look.ts";

test("both human bodies and their distance models carry every facial slider", () => {
  for (const file of ["body", "body-lo", "body-m", "body-m-lo"]) {
    const { json } = readGlb(
      readFileSync(
        new URL(`../../../../public/models/doll/${file}.glb`, import.meta.url),
      ),
    );
    const shaped = json.meshes.filter(
      (mesh) => mesh.extras?.targetNames?.length,
    );
    assert.ok(shaped.length, file);
    for (const mesh of shaped) {
      for (const { id } of FACE_SLIDERS) {
        assert.ok(mesh.extras?.targetNames?.includes(id), `${file}: ${id}`);
      }
      assert.ok(
        mesh.weights?.every((value) => value === 0),
        `${file}: neutral defaults`,
      );
    }
  }
});
