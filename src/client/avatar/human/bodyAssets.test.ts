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

// A picker option without a real deformation would appear to save but do nothing.
test("new eye and lip presets deform both bodies at both detail levels", () => {
  for (const file of ["body", "body-lo", "body-m", "body-m-lo"]) {
    const { json } = readGlb(
      readFileSync(
        new URL(`../../../../public/models/doll/${file}.glb`, import.meta.url),
      ),
    );
    for (const key of [
      "eye_narrow",
      "eye_open",
      "eye_soft-almond",
      "lips_rounded",
      "lips_cupid",
      "lips_top-full",
      "lips_bottom-full",
    ]) {
      const mesh = json.meshes.find((mesh) =>
        mesh.extras?.targetNames?.includes(key),
      );
      assert.ok(mesh, `${file}: ${key}`);
      const index = mesh.extras?.targetNames?.indexOf(key) ?? -1;
      assert.ok(
        mesh.primitives.some((primitive) => {
          const position = primitive.targets?.[index]?.POSITION;
          if (position === undefined) return false;
          const accessor = json.accessors[position];
          return [...(accessor.min ?? []), ...(accessor.max ?? [])].some(
            (value) => Math.abs(value) > 0.0001,
          );
        }),
        `${file}: ${key} must move vertices`,
      );
    }
  }
});
