// Police car chase through downtown: pure schedule, route progression along
// road graph, fleeing sports car and pursuing squad cars, crash and box-in.
import { test } from "node:test";
import assert from "node:assert/strict";
import { HEIST_LENGTH, heistOffset } from "./heist.ts";
import { ROAD_EDGES } from "./layout.ts";
import {
  blankChase,
  CHASE_COPS,
  CHASE_LENGTH,
  CHASE_ROUTES,
  CHASE_SLOT,
  chaseFrame,
  chaseInto,
  chaseOffset,
  chaseRouteFor,
  chaseStart,
  nextChaseIn,
} from "./chase.ts";

test("chase offset stays inside slot and never overlaps with heist", () => {
  for (let s = 0; s < 500; s++) {
    const cOffset = chaseOffset(s);
    assert.ok(cOffset >= 0, `slot ${s} offset >= 0`);
    assert.ok(
      cOffset + CHASE_LENGTH <= CHASE_SLOT,
      `slot ${s} offset + length <= CHASE_SLOT`,
    );

    const hOffset = heistOffset(s);
    const hEnd = hOffset + HEIST_LENGTH;
    const cEnd = cOffset + CHASE_LENGTH;
    const overlap = !(cEnd <= hOffset || cOffset >= hEnd);
    assert.ok(
      !overlap,
      `slot ${s} chase [${cOffset}, ${cEnd}] overlaps heist [${hOffset}, ${hEnd}]`,
    );
  }
});

test("chase start matches slot and offset", () => {
  const slot = 1000;
  assert.equal(chaseStart(slot), slot * CHASE_SLOT + chaseOffset(slot));
});

test("chaseInto and nextChaseIn report current or upcoming chase", () => {
  const slot = 42;
  const start = chaseStart(slot);
  assert.equal(chaseInto(start - 1), null);
  assert.equal(chaseInto(start), 0);
  assert.equal(chaseInto(start + 15.5), 15.5);
  assert.equal(chaseInto(start + CHASE_LENGTH - 0.1), CHASE_LENGTH - 0.1);
  assert.equal(chaseInto(start + CHASE_LENGTH), null);

  assert.equal(nextChaseIn(start - 20), 20);
  assert.equal(nextChaseIn(start), 0);
  assert.equal(nextChaseIn(start + 10), 0);
  assert.ok(nextChaseIn(start + CHASE_LENGTH + 1) > 0);
});

test("chase routes follow valid road edges in layout", () => {
  const edgeSet = new Set(
    ROAD_EDGES.flatMap((e) => [`${e.from}->${e.to}`, `${e.to}->${e.from}`]),
  );
  assert.ok(CHASE_ROUTES.length >= 4);
  for (const route of CHASE_ROUTES) {
    assert.ok(route.nodes.length >= 3);
    for (let i = 1; i < route.nodes.length; i++) {
      const from = route.nodes[i - 1];
      const to = route.nodes[i];
      assert.ok(
        edgeSet.has(`${from}->${to}`),
        `route ${route.id}: edge ${from} -> ${to} must exist in ROAD_EDGES`,
      );
    }
  }
});

test("chaseFrame mutates blankChase without crashing and handles states", () => {
  const frame = blankChase();
  const slot = 1000;
  const start = chaseStart(slot);
  const route = chaseRouteFor(slot);

  // Before chase: frame inactive
  const before = chaseFrame(start - 10, frame);
  assert.equal(before, false);
  assert.equal(frame.active, false);
  assert.equal(frame.fleeing.visible, false);
  for (const cop of frame.cops) assert.equal(cop.visible, false);

  // Mid-chase (running)
  const midTime = start + Math.min(10, route.crashTime / 2);
  const mid = chaseFrame(midTime, frame);
  assert.equal(mid, true);
  assert.equal(frame.active, true);
  assert.equal(frame.crashed, false);
  assert.equal(frame.fleeing.visible, true);
  assert.ok(frame.fleeing.speed > 0);
  assert.equal(frame.siren, true);
  assert.equal(frame.lights, true);

  // Post-crash (stopped and boxed in)
  const crashTime = start + route.crashTime + 5;
  const post = chaseFrame(crashTime, frame);
  assert.equal(post, true);
  assert.equal(frame.active, true);
  assert.equal(frame.crashed, true);
  assert.equal(frame.fleeing.speed, 0);
  for (let k = 0; k < CHASE_COPS; k++) {
    assert.equal(frame.cops[k].visible, true);
    assert.equal(frame.cops[k].speed, 0);
  }

  // After chase: inactive again
  const after = chaseFrame(start + CHASE_LENGTH + 5, frame);
  assert.equal(after, false);
  assert.equal(frame.active, false);
});
