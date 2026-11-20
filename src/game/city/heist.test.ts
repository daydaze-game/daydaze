// Tests for the heist at City Trust: when it happens, who goes where, and
// that every player sees the same one.
import assert from "node:assert/strict";
import test from "node:test";
import { BUILDINGS } from "./layout.ts";
import {
  BANK_DOOR,
  blankHeist,
  CURB_Z,
  HEIST_LENGTH,
  HEIST_SLOT,
  heistFrame,
  heistInto,
  heistOutcome,
  heistStart,
  heistSlotWith,
  nextHeistIn,
} from "./heist.ts";

const slotWith = heistSlotWith;

test("a heist starts somewhere in its slot and ends before the next slot", () => {
  const starts = new Set<number>();
  for (let slot = 0; slot < 50; slot++) {
    const start = heistStart(slot);
    assert.ok(start >= slot * HEIST_SLOT);
    assert.ok(start + HEIST_LENGTH <= (slot + 1) * HEIST_SLOT);
    starts.add(start - slot * HEIST_SLOT);
  }
  // not on the same minute every time
  assert.ok(starts.size > 40);
});

test("both endings come up", () => {
  const outcomes = new Set<string>();
  for (let slot = 0; slot < 40; slot++) outcomes.add(heistOutcome(slot));
  assert.deepEqual([...outcomes].sort(), ["caught", "escape"]);
});

test("heistSlotWith finds the first matching slot", () => {
  assert.equal(heistSlotWith("escape", 1000), 1000);
  assert.equal(heistSlotWith("caught", 1000), 1005);
  assert.equal(heistOutcome(heistSlotWith("caught", 1000)), "caught");
  assert.equal(heistOutcome(heistSlotWith("escape", 1000)), "escape");
});

test("the countdown reads 0 during a heist and counts to the next", () => {
  const start = heistStart(500);
  assert.equal(heistInto(start + 10), 10);
  assert.equal(nextHeistIn(start + 10), 0);
  assert.equal(nextHeistIn(start - 7), 7);
  assert.equal(heistInto(start - 7), null);
  assert.equal(
    nextHeistIn(start + HEIST_LENGTH),
    heistStart(501) - start - HEIST_LENGTH,
  );
});

test("nothing shows between heists", () => {
  const frame = blankHeist();
  assert.equal(heistFrame(heistStart(500) - 1, frame), false);
  assert.ok(frame.cops.every((c) => !c.visible));
  assert.ok(frame.robbers.every((r) => !r.visible));
  assert.equal(frame.getaway.visible, false);
});

test("the bank door is on City Trust's street face", () => {
  const bank = BUILDINGS.find((b) => b.id === "city-trust");
  assert.ok(bank);
  const xs = bank.footprint.map((p) => p[0]);
  const zs = bank.footprint.map((p) => p[1]);
  assert.ok(BANK_DOOR[0] > Math.min(...xs) && BANK_DOOR[0] < Math.max(...xs));
  assert.equal(BANK_DOOR[1], Math.max(...zs));
});

test("the alarm rings and the robbers run from the door", () => {
  const start = heistStart(slotWith("escape"));
  const frame = blankHeist();
  assert.ok(heistFrame(start + 1, frame));
  assert.equal(frame.alarm, true);
  heistFrame(start + 4.1, frame);
  const first = frame.robbers[0];
  assert.ok(first.visible);
  assert.ok(Math.hypot(first.x - BANK_DOOR[0], first.z - BANK_DOOR[1]) < 2);
  assert.ok(first.speed > 3, "robbers run");
});

test("on an escape the getaway car is gone before the police pull up", () => {
  const start = heistStart(slotWith("escape"));
  const frame = blankHeist();
  heistFrame(start + 12, frame);
  assert.ok(
    frame.robbers.every((r) => !r.visible),
    "robbers are in the car",
  );
  assert.ok(frame.getaway.visible && frame.getaway.speed > 0);
  assert.ok(frame.cops.every((c) => !c.visible));
  heistFrame(start + 40, frame);
  assert.equal(frame.getaway.visible, false);
  assert.ok(frame.cops.every((c) => c.visible && c.speed === 0));
  assert.equal(frame.lights, true);
});

test("when they're caught the robbers walk to the squad cars", () => {
  const start = heistStart(slotWith("caught"));
  const frame = blankHeist();
  heistFrame(start + 20, frame);
  assert.ok(frame.caught);
  assert.ok(frame.robbers.every((r) => r.visible && r.speed === 0));
  assert.ok(frame.getaway.visible && frame.getaway.speed === 0);
  heistFrame(start + 80, frame);
  assert.ok(
    frame.robbers.every((r) => !r.visible),
    "taken away",
  );
});

test("parked cars keep clear of the traffic lanes", () => {
  for (const outcome of ["escape", "caught"] as const) {
    const start = heistStart(slotWith(outcome));
    const frame = blankHeist();
    heistFrame(start + 45, frame);
    for (const car of [...frame.cops, frame.getaway])
      if (car.visible) assert.equal(car.z, CURB_Z);
  }
});

test("everything has left by the end", () => {
  for (const outcome of ["escape", "caught"] as const) {
    const start = heistStart(slotWith(outcome));
    const frame = blankHeist();
    assert.ok(heistFrame(start + HEIST_LENGTH - 0.01, frame));
    assert.equal(heistFrame(start + HEIST_LENGTH, frame), false);
    assert.ok(frame.cops.every((c) => !c.visible));
    assert.equal(frame.getaway.visible, false);
  }
});

test("every player sees the same heist", () => {
  const t = heistStart(slotWith("caught")) + 33.3;
  const a = blankHeist();
  const b = blankHeist();
  heistFrame(t, a);
  heistFrame(t, b);
  assert.deepEqual(a, b);
});

test("heistInto is free of float jitter on large clock values", () => {
  const start = heistStart(1000);
  assert.equal(heistInto(start + 74.9), 74.9);
});
