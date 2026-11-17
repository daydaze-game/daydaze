// The after-room-ready queue: work runs once when the room shows, at once if it
// already shows, and after a fallback wait on pages with no room.
import assert from "node:assert/strict";
import { test } from "node:test";
import { afterSceneReady, setSceneReady } from "./ready.ts";

test("work queued for after the room shows runs once, when it shows", () => {
  setSceneReady(false);
  let runs = 0;
  afterSceneReady(() => runs++, 60_000);
  assert.equal(runs, 0);
  setSceneReady(true);
  assert.equal(runs, 1);
  setSceneReady(false);
  setSceneReady(true);
  assert.equal(runs, 1);
});

test("a room already showing runs it at once", () => {
  setSceneReady(true);
  let runs = 0;
  afterSceneReady(() => runs++, 60_000);
  assert.equal(runs, 1);
});

test("a page with no room (a lab) still runs it, after the fallback wait", async () => {
  setSceneReady(false);
  let runs = 0;
  afterSceneReady(() => runs++, 10);
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(runs, 1);
  // and the room showing later doesn't run it again
  setSceneReady(true);
  assert.equal(runs, 1);
});
