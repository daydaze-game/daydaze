// Test support: lets a hand-built stand-in be passed where an AudioContext is
// expected, without a type assertion. Node has no Web Audio, so every audio
// test builds a minimal fake with just the methods the code under test calls.

/** Narrows `fake` to AudioContext after checking the one member every audio
 * test fake has. Deliberately shallow: each test's fake carries only the
 * nodes its code path touches, and `in` never runs a getter that throws. */
function isAudioContext(fake: object): fake is AudioContext {
  return "currentTime" in fake;
}

/** The fake as an AudioContext; throws if it is not even clock-shaped. */
export function toAudioContext(fake: object): AudioContext {
  if (!isAudioContext(fake)) throw new Error("fake has no currentTime");
  return fake;
}
