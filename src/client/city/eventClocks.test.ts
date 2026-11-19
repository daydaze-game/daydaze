// Tests for event clocks: preview holding with URL flags and heist ending selection.

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  HEIST_SLOT,
  heistInto,
  heistOffset,
  heistOutcome,
  heistSlotWith,
  heistStart,
} from "../../game/city/heist.ts";
import { heistPreviewConfig } from "./eventClocks.ts";

test("heistPreviewConfig defaults to slot 1000's escape heist", () => {
  const { slot, lead } = heistPreviewConfig("");
  assert.equal(slot, 1000);
  assert.equal(lead, heistOffset(1000));
  assert.equal(heistOutcome(slot), "escape");
});

test("heistPreviewConfig picks first caught slot from 1000 for ?heistend=caught", () => {
  const { slot, lead } = heistPreviewConfig("?heist=30&heistend=caught");
  assert.equal(slot, heistSlotWith("caught", 1000));
  assert.equal(lead, heistOffset(slot));
  assert.equal(heistOutcome(slot), "caught");
  assert.equal(slot, 1005);
});

test("heistPreviewConfig picks first escape slot from 1000 for ?heistend=escape", () => {
  const { slot, lead } = heistPreviewConfig("?heist=30&heistend=escape");
  assert.equal(slot, 1000);
  assert.equal(lead, heistOffset(1000));
  assert.equal(heistOutcome(slot), "escape");
});

test("heist clock calculations for held preview align with heistInto and outcome", () => {
  const { slot, lead } = heistPreviewConfig("?heist=30&heistend=caught");
  const t = heistStart(slot) + 30;
  assert.equal(t, slot * HEIST_SLOT + lead + 30);
  assert.equal(heistInto(t), 30);
  assert.equal(heistOutcome(Math.floor(t / HEIST_SLOT)), "caught");
});
