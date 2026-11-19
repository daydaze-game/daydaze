// The browser's AudioContext constructor, or undefined where there is none
// (Node, or an old Safari that only ships the prefixed `webkitAudioContext`).

function isAudioContextClass(value: unknown): value is typeof AudioContext {
  return typeof value === "function";
}

/** The AudioContext constructor, falling back to the webkit-prefixed one. */
export function getAudioContextClass(): typeof AudioContext | undefined {
  // read by name: the standard class is absent in Node and old browsers
  const standard: unknown = Reflect.get(globalThis, "AudioContext");
  if (isAudioContextClass(standard)) return standard;
  const legacy: unknown = Reflect.get(globalThis, "webkitAudioContext");
  return isAudioContextClass(legacy) ? legacy : undefined;
}
