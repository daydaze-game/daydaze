// World sounds stay silent and never throw when Web Audio is unavailable.
import { test } from "node:test";
import assert from "node:assert/strict";
import { resetSharedAudioBusForTests } from "./audioBus.ts";
import { toAudioContext } from "./fakeAudioContext.ts";
import {
  playCheer,
  playChop,
  playGong,
  playSizzle,
  playClick,
  playDoorThunk,
  startEngineHum,
  playFanfare,
  playFireworkBoom,
  playCrashBoom,
  playHorn,
  playScreech,
  playPurr,
  playShellNote,
  playSplash,
  playSquirt,
  playZap,
  playStinger,
  playCreak,
  playChime,
  playStep,
  playThump,
  playWhoosh,
  startAlarmBell,
  startAmbience,
  startSiren,
  unlockAudio,
} from "./worldSounds.ts";

test("world sounds stay silent and never throw without Web Audio", () => {
  resetSharedAudioBusForTests();
  assert.equal(playStep("hard"), false);
  assert.equal(playStep("soft"), false);
  assert.equal(playStep("wood"), false);
  assert.equal(playStep("tile"), false);
  assert.equal(playStep("metal"), false);
  assert.equal(playStep("gravel"), false);
  assert.equal(playStep("puddle"), false);
  assert.equal(playStep("wet"), false);
  assert.equal(playStep("pavement"), false);
  assert.equal(playStep("grass"), false);
  assert.equal(playStep("sand"), false);
  assert.equal(playWhoosh(), false);
  assert.equal(playClick(), false);
  assert.equal(playFanfare(1), false);
  assert.equal(playFireworkBoom(1), false);
  assert.equal(playCrashBoom(1), false);
  assert.equal(playShellNote(2), false);
  assert.equal(playPurr(2), false);
  assert.equal(playHorn(), false);
  assert.equal(playScreech(), false);
  assert.equal(playCheer(1), false);
  assert.equal(playThump(1), false);
  assert.equal(playSplash(1), false);
  assert.equal(playSquirt(), false);
  assert.equal(playSizzle(), false);
  assert.equal(playChop(), false);
  assert.equal(playGong(), false);
  assert.equal(playZap(), false);
  assert.equal(playStinger(), false);
  assert.equal(playCreak(), false);
  assert.equal(playChime(1), false);
  assert.equal(playDoorThunk(), false);
  assert.doesNotThrow(startEngineHum());
  assert.equal(startAlarmBell(), null);
  assert.equal(startSiren(), null);
  const stop = startAmbience("beach");
  assert.equal(typeof stop, "function");
  assert.doesNotThrow(stop);
  assert.doesNotThrow(unlockAudio);
});

function makeFakeAudioContext(): AudioContext {
  const node = () => {
    const n = {
      connect: (target: unknown) => target ?? n,
      disconnect: () => {},
      gain: {
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
        value: 1,
      },
      frequency: {
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
        value: 440,
      },
      Q: {
        setValueAtTime: () => {},
        value: 1,
      },
      start: () => {},
      stop: () => {},
    };
    return n;
  };
  const fake = {
    currentTime: 0,
    sampleRate: 44100,
    state: "running",
    destination: {},
    createGain: () => node(),
    createBufferSource: () => node(),
    createBiquadFilter: () => node(),
    createOscillator: () => node(),
    createBuffer: () => ({ getChannelData: () => new Float32Array(88200) }),
    resume: () => Promise.resolve(),
    close: () => Promise.resolve(),
  };
  return toAudioContext(fake);
}

test("playStep synthesizes audio for all supported surface types when running", () => {
  const prev = Reflect.get(globalThis, "AudioContext");
  try {
    Reflect.set(
      globalThis,
      "AudioContext",
      class {
        constructor() {
          return makeFakeAudioContext();
        }
      },
    );
    resetSharedAudioBusForTests();

    const surfaces = [
      "hard",
      "soft",
      "wood",
      "tile",
      "metal",
      "gravel",
      "puddle",
      "wet",
      "pavement",
      "grass",
      "sand",
    ] as const;

    for (const surface of surfaces) {
      assert.equal(
        playStep(surface),
        true,
        `playStep failed for surface: ${surface}`,
      );
    }
  } finally {
    Reflect.set(globalThis, "AudioContext", prev);
    resetSharedAudioBusForTests();
  }
});
