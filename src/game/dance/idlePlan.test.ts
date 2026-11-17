// Idle plans: every clip is baked, the hash is deterministic, the player breathes
// then rotates idles, sober dolls skip wired loops, and temperaments differ.
import assert from "node:assert/strict";
import { test } from "node:test";
import { clipOf, pickClip } from "./clips.ts";
import { BODY, type Body } from "../effects/substances.ts";
import {
  bodyIdle,
  CALM_IDLES,
  FIDGET_IDLES,
  GESTURE_IDLES,
  IDLE_SLOT_SECONDS,
  PHONE_IDLES,
  SEAT_CALM,
  SEAT_FIDGET,
  SEAT_TALK,
  TALK_CLIPS,
  idlePlan,
  idleSlot,
  mix,
  packOfIdle,
  seatPlan,
  talkClipFor,
  temperamentOf,
  type Temperament,
} from "./idlePlan.ts";

test("every clip the plans can pick is baked, in the pack they say", () => {
  for (const id of [...CALM_IDLES, ...FIDGET_IDLES, ...PHONE_IDLES])
    assert.equal(clipOf(id)?.kind, "idle", id);
  for (const id of GESTURE_IDLES) {
    assert.equal(clipOf(id)?.kind, "emote", id);
    assert.equal(clipOf(id)?.pack, "social", id);
    assert.equal(packOfIdle(id), "social");
  }
  for (const id of [...SEAT_CALM, ...SEAT_FIDGET, ...SEAT_TALK])
    assert.equal(clipOf(id)?.kind, "seat", id);
  assert.equal(packOfIdle("idle-phone"), "core");
});

test("the hash is deterministic and spreads", () => {
  assert.equal(mix(3, 4), mix(3, 4));
  assert.notEqual(mix(3, 4), mix(4, 3));
  const buckets = new Array<number>(10).fill(0);
  for (let i = 0; i < 5000; i++) buckets[mix(i, 7) % 10] += 1;
  for (const n of buckets) assert.ok(n > 380 && n < 620, `bucket ${n}`);
});

test("the player starts on her breathing and then rotates idles", () => {
  assert.equal(idlePlan(0, 0, true, true), "idle-breathing");
  assert.equal(idlePlan(5, 0, true, false), "idle-breathing");
  const seen = new Set<string>();
  for (let slot = 1; slot < 80; slot++) {
    const id = idlePlan(0, slot, true, true);
    // she never gestures at nobody: only calm and fidget idles
    assert.ok(CALM_IDLES.includes(id) || FIDGET_IDLES.includes(id), id);
    seen.add(id);
  }
  assert.ok(seen.size >= 7, `${seen.size} idles in 80 slots`);
  // she mostly stands easy and fidgets now and then, not always and not never
  let fidgets = 0;
  for (let slot = 1; slot <= 400; slot++)
    if (FIDGET_IDLES.includes(idlePlan(0, slot, true, true))) fidgets += 1;
  assert.ok(fidgets > 40 && fidgets < 130, `${fidgets} of 400`);
});

test("a sober doll never plays the busy loops that read as wired", () => {
  const wired = ["idle-shoulders", "idle-sweat", "idle-happy"];
  for (let seed = 0; seed < 50; seed++)
    for (let slot = 0; slot < 60; slot++)
      for (const own of [true, false])
        assert.equal(wired.includes(idlePlan(seed, slot, own, true)), false);
});

test("temperaments differ across a crowd and decide how a stranger stands", () => {
  const counts: Record<Temperament, number> = {
    calm: 0,
    restless: 0,
    phone: 0,
    chatty: 0,
  };
  for (let seed = 0; seed < 1000; seed++) counts[temperamentOf(seed)] += 1;
  for (const n of Object.values(counts))
    assert.ok(n > 60, JSON.stringify(counts));
  const pick = (t: Temperament) =>
    Array.from({ length: 1000 }, (_, i) => i).find(
      (seed) => temperamentOf(seed) === t,
    ) ?? -1;
  const share = (t: Temperament, pool: readonly string[]) => {
    const seed = pick(t);
    let n = 0;
    for (let slot = 0; slot < 500; slot++)
      if (pool.includes(idlePlan(seed, slot, false, true))) n += 1;
    return n / 500;
  };
  assert.ok(share("calm", CALM_IDLES) > 0.55);
  assert.ok(share("restless", FIDGET_IDLES) > 0.45);
  assert.ok(share("phone", PHONE_IDLES) > 0.55);
  assert.ok(share("chatty", GESTURE_IDLES) > 0.4);
  // without the social pack a chatty stranger fidgets instead
  const chatty = pick("chatty");
  for (let slot = 0; slot < 100; slot++)
    assert.equal(
      GESTURE_IDLES.includes(idlePlan(chatty, slot, false, false)),
      false,
    );
});

test("idle slots count whole holds, never negative", () => {
  assert.equal(idleSlot(0), 0);
  assert.equal(idleSlot(IDLE_SLOT_SECONDS - 0.01), 0);
  assert.equal(idleSlot(IDLE_SLOT_SECONDS), 1);
  assert.equal(idleSlot(-5), 0);
});

test("a seated doll settles first, then fidgets; a chatty one talks", () => {
  assert.equal(seatPlan(0, 0, true), "sit-idle");
  const used = new Set<string>();
  for (let slot = 1; slot < 60; slot++) used.add(seatPlan(0, slot, true));
  for (const id of used)
    assert.ok(SEAT_CALM.includes(id) || SEAT_FIDGET.includes(id), id);
  assert.ok(used.size >= 4);
  const chatty =
    Array.from({ length: 100 }, (_, i) => i).find(
      (s) => temperamentOf(s) === "chatty",
    ) ?? -1;
  let talks = 0;
  for (let slot = 0; slot < 200; slot++)
    if (SEAT_TALK.includes(seatPlan(chatty, slot, false))) talks += 1;
  assert.ok(talks > 80, `${talks} of 200`);
});

test("a speaking NPC's gestures are baked social clips, varied by seed and line", () => {
  const used = new Set<string>();
  for (let seed = 0; seed < 30; seed++)
    for (let n = 0; n < 6; n++) {
      const id = talkClipFor(seed, n);
      assert.ok(TALK_CLIPS.includes(id), id);
      assert.ok(clipOf(id), id);
      used.add(id);
    }
  assert.ok(used.size >= 5);
  // two lines in a row keep her manner; the next pair may change it
  assert.equal(talkClipFor(4, 0), talkClipFor(4, 1));
});

test("under a substance: a tic once at a slot's start, then its loops", () => {
  const body = BODY.trip.comeup;
  const ready = (id: string) => clipOf(id)?.period ?? 0;
  let tics = 0;
  for (let slot = 0; slot < 200; slot++) {
    const first = bodyIdle(body, 4, slot, 0, ready);
    const late = bodyIdle(body, 4, slot, IDLE_SLOT_SECONDS - 0.1, ready);
    // late in a slot she is always on a loop, never repeating a tic
    assert.ok(body.loops.includes(late), late);
    if (body.tics.includes(first)) tics += 1;
    else assert.equal(first, late);
    // with the tic's pack not loaded she just plays the loop
    assert.ok(body.loops.includes(bodyIdle(body, 4, slot, 0, () => 0)));
  }
  assert.ok(tics > 60 && tics < 140, `${tics} of 200`);
  const doll = (b: Body | null) =>
    pickClip({
      loaded: true,
      own: true,
      slot: 3,
      into: 9,
      speed: 0,
      walk: undefined,
      mood: "idle",
      hold: undefined,
      dance: "",
      couple: undefined,
      seed: 4,
      body: b,
    });
  assert.equal(doll(body)?.rate, body.rate);
  assert.ok(body.loops.includes(doll(body)?.id ?? ""));
  assert.equal(doll(null)?.rate, 1);
});
