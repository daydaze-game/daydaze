// Tests for the screen recording script's option parsing and naming.
import assert from "node:assert/strict";
import { test } from "node:test";
import { MINIGAME_IDS } from "../src/game/hotspots.ts";
import {
  concatList,
  parseOptions,
  recordUrl,
  recordingName,
} from "./record.ts";

test("defaults record the plaza for 20 seconds at low quality", () => {
  const o = parseOptions({});
  assert.deepEqual(o, {
    scene: "room=plaza",
    game: "",
    clicks: [],
    seconds: 20,
    timescale: 1,
    quality: "low",
    mobile: false,
  });
});

test("a scene, a known game and numbers are accepted", () => {
  const game = MINIGAME_IDS[0];
  const o = parseOptions({
    SCENE: "room=karaoke&time=23:00",
    GAME: game,
    CLICKS: "Play, Next",
    SECONDS: "45",
    TIMESCALE: "0.25",
    QUALITY: "high",
    MOBILE: "1",
  });
  assert.equal(o.game, game);
  assert.deepEqual(o.clicks, ["Play", "Next"]);
  assert.equal(o.seconds, 45);
  assert.equal(o.mobile, true);
  assert.equal(
    recordUrl("http://x", o),
    "http://x/?quality=high&room=karaoke&time=23:00&timescale=0.25",
  );
});

test("bad input is rejected with a message that names it", () => {
  assert.throws(() => parseOptions({ SCENE: "room=a b" }), /SCENE/);
  assert.throws(() => parseOptions({ SCENE: 'room=a"onload=x' }), /SCENE/);
  assert.throws(() => parseOptions({ GAME: "not-a-game" }), /GAME/);
  assert.throws(() => parseOptions({ CLICKS: "Play;rm -rf" }), /CLICKS/);
  assert.throws(() => parseOptions({ SECONDS: "0" }), /SECONDS/);
  assert.throws(() => parseOptions({ SECONDS: "500" }), /SECONDS/);
  assert.throws(() => parseOptions({ SECONDS: "abc" }), /SECONDS/);
  assert.throws(() => parseOptions({ TIMESCALE: "2" }), /TIMESCALE/);
  assert.throws(() => parseOptions({ QUALITY: "ultra" }), /QUALITY/);
});

test("the file name is safe and names the game or the scene", () => {
  assert.equal(
    recordingName(parseOptions({ SCENE: "room=karaoke&time=23:00" })),
    "room-karaoke-time-23-00",
  );
  assert.equal(
    recordingName(parseOptions({ GAME: MINIGAME_IDS[0] })),
    `game-${MINIGAME_IDS[0]}`.replace(/[^A-Za-z0-9]+/g, "-"),
  );
});

test("the concat list holds each frame until the next one paints", () => {
  assert.equal(
    concatList([10, 10.5, 12], 13),
    "file '00000.jpg'\nduration 0.500\nfile '00001.jpg'\nduration 1.500\nfile '00002.jpg'\nduration 1.000\nfile '00002.jpg'\n",
  );
});
