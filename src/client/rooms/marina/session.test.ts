// Fishing must cancel a pending request to enter a city car.
import assert from "node:assert/strict";
import test from "node:test";
import { driving } from "../../world/driving.ts";
import { fishing, leave, start } from "./session.ts";

test("starting boardwalk fishing cancels a pending drive request", () => {
  driving.request = "city-drive";
  start(100, "boardwalk");
  assert.equal(driving.request, null);
  assert.equal(fishing.get().phase, "power");
  leave();
});

test("a passenger must leave the vehicle before fishing", () => {
  driving.passenger = "driver";
  assert.equal(start(200, "boardwalk"), false);
  assert.equal(fishing.get().phase, "off");
  driving.passenger = null;
});
