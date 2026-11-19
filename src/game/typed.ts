// Small type-narrowing helpers, so code never needs an `as` assertion or a
// `!`: typed object keys, string-to-union guards, a plain-object guard and a
// "this must exist" unwrap. Pure.

/** The keys of `obj`, typed as its key union (`Object.keys` alone gives
 * `string[]`). The guard is real: it checks each key is on the object. */
export function typedKeys<T extends object>(obj: T): Array<keyof T & string> {
  return Object.keys(obj).filter((k): k is keyof T & string => k in obj);
}

/** True when `value` is one of the `allowed` literals; narrows it to the union. */
export function isOneOf<T extends string>(
  allowed: readonly T[],
  value: unknown,
): value is T {
  return allowed.some((a) => a === value);
}

/** True for a non-null, non-array object, so its fields can be read as `unknown`. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** `value` itself, or a thrown error when it is null or undefined: the
 * checked replacement for a `!` in tests and for lookups that cannot miss. */
export function must<T>(
  value: T | null | undefined,
  what = "value",
): NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error(`expected ${what} to exist`);
  }
  return value;
}

/** A point on the ground plane (see walk.ts `Vec2`), built without a cast. */
export function vec2(x: number, z: number): readonly [x: number, z: number] {
  return [x, z];
}
