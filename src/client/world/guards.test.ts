// Tests for the scene-graph type guards.
import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  isBone,
  isInstancedMesh,
  isMesh,
  isPoints,
  isSkinnedMesh,
} from "./guards.ts";

test("each guard accepts its own class and rejects a plain group", () => {
  const group = new THREE.Group();
  assert.equal(isMesh(new THREE.Mesh()), true);
  assert.equal(isSkinnedMesh(new THREE.SkinnedMesh()), true);
  assert.equal(isBone(new THREE.Bone()), true);
  assert.equal(isMesh(group), false);
  assert.equal(isSkinnedMesh(new THREE.Mesh()), false);
  assert.equal(isBone(group), false);
});

test("points and instanced meshes are told apart, and null is no node", () => {
  const instanced = new THREE.InstancedMesh(
    new THREE.BufferGeometry(),
    new THREE.MeshBasicMaterial(),
    1,
  );
  assert.equal(isPoints(new THREE.Points()), true);
  assert.equal(isPoints(instanced), false);
  assert.equal(isInstancedMesh(instanced), true);
  assert.equal(isInstancedMesh(new THREE.Mesh()), false);
  assert.equal(isMesh(null), false);
  assert.equal(isMesh(undefined), false);
});
