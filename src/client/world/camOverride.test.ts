// Tests for runtime camera override parsing and subscription.
import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import {
  clearCamOverride,
  formatCamOverride,
  getCamOverride,
  parseCamOverride,
  setCamOverride,
  subscribeCamOverride,
} from "./camOverride.ts";

test("parseCamOverride parses comma-separated string", () => {
  const shot = parseCamOverride("1,2,3,4,5,6");
  assert.ok(shot);
  assert.deepEqual(shot.eye.toArray(), [1, 2, 3]);
  assert.deepEqual(shot.look.toArray(), [4, 5, 6]);
});

test("parseCamOverride parses query-string prefixes ?cam= and cam=", () => {
  const shot1 = parseCamOverride("?cam=10.5,-2,3.14,0,1,0");
  assert.ok(shot1);
  assert.deepEqual(shot1.eye.toArray(), [10.5, -2, 3.14]);
  assert.deepEqual(shot1.look.toArray(), [0, 1, 0]);

  const shot2 = parseCamOverride("cam=0,5,10,0,0,0");
  assert.ok(shot2);
  assert.deepEqual(shot2.eye.toArray(), [0, 5, 10]);
  assert.deepEqual(shot2.look.toArray(), [0, 0, 0]);
});

test("parseCamOverride parses 6-number array", () => {
  const shot = parseCamOverride([1, 2, 3, 4, 5, 6]);
  assert.ok(shot);
  assert.deepEqual(shot.eye.toArray(), [1, 2, 3]);
  assert.deepEqual(shot.look.toArray(), [4, 5, 6]);
});

test("parseCamOverride parses eye/look object with Vector3 or arrays", () => {
  const shot1 = parseCamOverride({
    eye: new THREE.Vector3(1, 2, 3),
    look: new THREE.Vector3(4, 5, 6),
  });
  assert.ok(shot1);
  assert.deepEqual(shot1.eye.toArray(), [1, 2, 3]);
  assert.deepEqual(shot1.look.toArray(), [4, 5, 6]);

  const shot2 = parseCamOverride({
    eye: [7, 8, 9],
    look: [10, 11, 12],
  });
  assert.ok(shot2);
  assert.deepEqual(shot2.eye.toArray(), [7, 8, 9]);
  assert.deepEqual(shot2.look.toArray(), [10, 11, 12]);
});

test("parseCamOverride returns null for invalid input", () => {
  assert.equal(parseCamOverride(null), null);
  assert.equal(parseCamOverride(undefined), null);
  assert.equal(parseCamOverride(""), null);
  assert.equal(parseCamOverride("1,2,3"), null);
  assert.equal(parseCamOverride("1,2,3,4,5,foo"), null);
  assert.equal(parseCamOverride([1, 2, 3]), null);
});

test("formatCamOverride formats shot as comma-separated coordinates", () => {
  const shot = {
    eye: new THREE.Vector3(1.25, 2, -3.5),
    look: new THREE.Vector3(0, 1, 0),
  };
  assert.equal(formatCamOverride(shot), "1.25,2,-3.5,0,1,0");
  assert.equal(formatCamOverride(null), "");
});

test("setCamOverride updates state and notifies subscribers", () => {
  const calls: (string | null)[] = [];
  const unsubscribe = subscribeCamOverride((shot) => {
    calls.push(formatCamOverride(shot));
  });

  setCamOverride("1,2,3,4,5,6");
  const current = getCamOverride();
  assert.ok(current);
  assert.deepEqual(current.eye.toArray(), [1, 2, 3]);

  clearCamOverride();
  assert.equal(getCamOverride(), null);
  unsubscribe();

  assert.deepEqual(calls, ["1,2,3,4,5,6", ""]);
});
