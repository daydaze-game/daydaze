// Scene walks for the dev panel: the tree search and the instance box.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { objectBox, objectPath, searchScene } from "./sceneUtil.ts";

test("searchScene matches names and types, capped, with the full count", () => {
  const scene = new THREE.Scene();
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh();
    m.name = `lamp-${i}`;
    scene.add(m);
  }
  scene.add(new THREE.PointLight());
  const lamps = searchScene(scene, "LAMP", 3);
  assert.equal(lamps.total, 5);
  assert.equal(lamps.hits.length, 3);
  assert.equal(searchScene(scene, "pointlight", 10).total, 1);
  assert.equal(searchScene(scene, "scene", 10).total, 0); // never the root
});

test("objectBox boxes one instance, not the whole batch", () => {
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial(),
    2,
  );
  mesh.setMatrixAt(0, new THREE.Matrix4());
  mesh.setMatrixAt(1, new THREE.Matrix4().makeTranslation(10, 0, 0));
  const box = objectBox(mesh, 1, new THREE.Box3());
  assert.deepEqual(box.min.toArray(), [9.5, -0.5, -0.5]);
  assert.deepEqual(box.max.toArray(), [10.5, 0.5, 0.5]);
});

test("objectPath names each level by name or type", () => {
  const scene = new THREE.Scene();
  const group = new THREE.Group();
  group.name = "shop";
  const mesh = new THREE.Mesh();
  group.add(mesh);
  scene.add(group);
  assert.equal(objectPath(mesh), "Scene > shop > Mesh");
});
