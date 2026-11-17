// Reproduce a family first rendered empty, then populated after district travel.
import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import type { DreamSpot } from "../../game/city/dream.ts";
import { createDreamMesh, placeDreamMeshes } from "./dreamMeshes.ts";

test("streamed architecture remains renderable after an empty first view", () => {
  const geometry = new THREE.BoxGeometry(20, 16, 16);
  const material = new THREE.MeshStandardMaterial();
  const mesh = createDreamMesh(geometry, material);
  const family = [{ kind: "conservatory", far: false, mesh }] as const;
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.set(300, 13, 60);
  camera.lookAt(300, 13, 20);
  camera.updateMatrixWorld();
  const projection = new THREE.Matrix4().multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse,
  );
  const frustum = new THREE.Frustum().setFromProjectionMatrix(projection);
  const rendererAccepts = () =>
    !mesh.frustumCulled || frustum.intersectsObject(mesh);
  // The renderer saw this family before any of its buildings were in range.
  placeDreamMeshes(family, []);
  rendererAccepts();
  const spot: DreamSpot = {
    id: "new-district",
    kind: "conservatory",
    x: 300,
    y: 13,
    z: 20,
    sx: 1,
    sy: 1,
    sz: 1,
    yaw: 0,
    color: "#ffffff",
    far: false,
  };
  placeDreamMeshes(family, [spot]);
  assert.equal(
    rendererAccepts(),
    true,
    "the aggregate gate hides a newly streamed family",
  );
  assert.equal(mesh.instancesCount, 1);
  assert.equal(
    mesh.perObjectFrustumCulled,
    true,
    "individual buildings still undergo frustum culling",
  );
  mesh.dispose();
  geometry.dispose();
  material.dispose();
});
