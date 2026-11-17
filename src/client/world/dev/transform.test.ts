// The inspector's transform edits: plain objects and single instances of an
// instanced mesh read and write the same way, rotation in degrees.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { readTransform, transformJsx, writeTransform } from "./transform.ts";

test("an object's transform reads back what was written", () => {
  const sel = { object: new THREE.Object3D(), instanceId: null };
  writeTransform(sel, "position", 1, 2.5);
  writeTransform(sel, "rotation", 1, 90);
  writeTransform(sel, "scale", 0, 3);
  const t = readTransform(sel);
  assert.deepEqual(t.position, [0, 2.5, 0]);
  assert.deepEqual(t.rotation, [0, 90, 0]);
  assert.deepEqual(t.scale, [3, 1, 1]);
  assert.equal(sel.object.rotation.y, Math.PI / 2);
});

test("an instance edit moves only that instance", () => {
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(),
    new THREE.MeshBasicMaterial(),
    2,
  );
  for (const i of [0, 1]) mesh.setMatrixAt(i, new THREE.Matrix4());
  writeTransform({ object: mesh, instanceId: 1 }, "position", 0, 4);
  assert.deepEqual(
    readTransform({ object: mesh, instanceId: 1 }).position,
    [4, 0, 0],
  );
  assert.deepEqual(
    readTransform({ object: mesh, instanceId: 0 }).position,
    [0, 0, 0],
  );
});

test("a non-number leaves the transform alone", () => {
  const sel = { object: new THREE.Object3D(), instanceId: null };
  writeTransform(sel, "position", 0, Number.NaN);
  assert.equal(sel.object.position.x, 0);
});

test("transformJsx gives R3F props with rotation in radians", () => {
  assert.equal(
    transformJsx({
      position: [1, 2, 3],
      rotation: [0, 180, 0],
      scale: [1, 1, 1],
    }),
    "position={[1, 2, 3]} rotation={[0, 3.142, 0]} scale={[1, 1, 1]}",
  );
});
