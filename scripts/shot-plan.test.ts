// The screenshot token language: registry names, raw queries, presets, turns,
// viewport sizes, the hard error on bad tokens, sharding and the gallery README.
import assert from "node:assert/strict";
import { test } from "node:test";
import { ADULT_ROOMS } from "../src/game/age.ts";
import { BUILDINGS } from "../src/game/city/layout.ts";
import { spotFor } from "../src/game/city/spots.ts";
import {
  expandShots,
  galleryMarkdown,
  parseStats,
  shard,
} from "./shot-plan.ts";

const known = (n: string) => n === "yacht" || n === "club-pulse";

test("registry names pass through; unknown names fail loudly", () => {
  assert.deepEqual(expandShots(["yacht"], known), [
    { name: "yacht", token: "yacht" },
  ]);
  assert.throws(() => expandShots(["yacht", "nope"], known), /nope/);
});

test("a raw query is named by its slug and keeps its flags", () => {
  const [shot] = expandShots(
    ["room=city&at=10,5&yaw=1.57&view=full&time=21:00"],
    known,
  );
  assert.equal(shot?.name, "room-city-at-10-5-yaw-1-57-view-full-time-21-00");
  assert.equal(shot?.query, "room=city&at=10,5&yaw=1.57&view=full&time=21:00");
});

test("camera overrides dist, pitch, fov, height pass through query", () => {
  const [shot] = expandShots(
    ["spot=pulse&dist=12&pitch=15&fov=45&height=2.5"],
    known,
  );
  assert.equal(shot?.query, "spot=pulse&dist=12&pitch=15&fov=45&height=2.5");
});

test("heist and heistend pass through query", () => {
  const [shot] = expandShots(
    ["room=city&heist=30&heistend=caught&at=-170,9"],
    known,
  );
  assert.equal(shot?.query, "room=city&heist=30&heistend=caught&at=-170,9");
});

test("a bad query is rejected before any browser starts", () => {
  for (const bad of [
    "room=city;rm",
    "room=city&x=$(id)",
    "room=City",
    "name=Bad&room=city",
    "room=club&turn=4",
    "room=city&at=0,0&turn=0",
    "room=city&w=1920",
    "room=city&w=99999&h=1080",
    "name=x",
    "room=city&&view=full",
    "spot=nowhere",
  ])
    assert.throws(() => expandShots([bad], known), /bad shots/, bad);
});

test("turn=N gives N evenly spaced headings named -NN", () => {
  const shots = expandShots(["name=sq&room=city&at=0,0&turn=4"], known);
  assert.deepEqual(
    shots.map((s) => s.name),
    ["sq-00", "sq-01", "sq-02", "sq-03"],
  );
  assert.deepEqual(
    shots.map((s) => new URLSearchParams(s.query).get("yaw")),
    ["0.000", "1.571", "3.142", "4.712"],
  );
  // the canonical token expands back to the same one shot
  for (const s of shots) assert.deepEqual(expandShots([s.token], known), [s]);
});

test("a spot's turn starts from the spot's own heading", () => {
  const [first] = expandShots(["spot=pulse&turn=4"], known);
  assert.equal(
    new URLSearchParams(first?.query).get("yaw"),
    spotFor("pulse")?.yaw.toFixed(3),
  );
});

test("w and h set the viewport and stay out of the page's query", () => {
  const [shot] = expandShots(
    ["name=hero&room=pulse&quality=high&w=1920&h=1080"],
    known,
  );
  assert.deepEqual(shot?.viewport, { width: 1920, height: 1080 });
  assert.equal(shot?.query, "room=pulse&quality=high");
});

test("tour is every all-ages room and every door, with no repeats", () => {
  const tour = expandShots(["tour", "all-rooms"], known);
  const rooms = tour.filter((s) => s.name.startsWith("tour-room-"));
  const spots = tour.filter((s) => s.name.startsWith("tour-spot-"));
  assert.equal(spots.length, BUILDINGS.filter((b) => b.door).length);
  assert.equal(rooms.length + spots.length, tour.length);
  for (const id of ADULT_ROOMS)
    assert.ok(!rooms.some((s) => s.name === `tour-room-${id}`), id);
  assert.ok(rooms.some((s) => s.query === "room=city"));
});

test("shards deal round-robin and never come out empty", () => {
  const shots = expandShots(["all-rooms"], known);
  const chunks = shard(shots, 6);
  assert.equal(chunks.length, 6);
  assert.equal(chunks.flat().length, shots.length);
  assert.deepEqual(shard(shots.slice(0, 2), 6).length, 2);
  assert.deepEqual(shard(shots.slice(0, 2), Number.NaN).length, 1);
});

test("the gallery groups images and shows their numbers", () => {
  const md = galleryMarkdown(
    ["tour-room-city.jpg", "yacht.png", "stats.jsonl", "tour-spot-pulse.jpg"],
    parseStats(
      '{"name":"yacht","frames":9,"calls":120,"triangles":45678,"seconds":40}\n{"broken\n',
    ),
    { ref: "main", sha: "abcdef0123", repo: "o/r", time: "2026-11-18T00:00Z" },
  );
  assert.match(md, /^# Screenshots: main/);
  assert.match(
    md,
    /## Rooms \(1\)[\s\S]*## City spots \(1\)[\s\S]*## Other shots \(1\)/,
  );
  assert.match(md, /120 calls, 46k triangles/);
  assert.match(md, /`city`/);
  // shards append stats; a killed one leaves a half line, which is skipped
  assert.equal(parseStats('{"name":"a"}\nnot json\n').length, 0);
  assert.doesNotMatch(md, /stats\.jsonl/);
});
