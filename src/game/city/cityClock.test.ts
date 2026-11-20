// The city clock gives one answer for an instant, in New York, in any viewer zone.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { cityHourOf, citySecondsOf, cityTime } from "./cityClock.ts";

test("an instant reads as New York time (EST and EDT)", () => {
  assert.equal(cityHourOf(new Date("2026-01-15T17:30:00Z")), 12.5);
  assert.equal(cityHourOf(new Date("2026-07-15T16:30:00Z")), 12.5);
  assert.equal(
    citySecondsOf(new Date("2026-07-15T16:30:05Z")),
    12 * 3600 + 1805,
  );
});

test("the date and weekday follow New York, not UTC", () => {
  // 03:00 UTC on Wed 2026-07-01 is still Tue 2026-06-30 at 23:00 in New York.
  const t = cityTime(new Date("2026-07-01T03:00:00Z"));
  assert.deepEqual(
    [t.year, t.month, t.day, t.weekday, t.hour],
    [2026, 6, 30, 2, 23],
  );
});

test("the same second reuses one object; the next second is new", () => {
  const a = cityTime(new Date("2026-07-15T16:30:05.100Z"));
  const b = cityTime(new Date("2026-07-15T16:30:05.900Z"));
  assert.equal(a, b);
  const c = cityTime(new Date("2026-07-15T16:30:06Z"));
  assert.equal(c.second, 6);
  assert.equal(c.hour, 12);
});

test("both DST changeovers", () => {
  // Spring forward 2026-03-08: 06:59Z is 01:59 EST, 07:00Z is 03:00 EDT.
  assert.equal(cityHourOf(new Date("2026-03-08T06:59:00Z")), 1 + 59 / 60);
  assert.equal(cityHourOf(new Date("2026-03-08T07:00:00Z")), 3);
  // Fall back 2026-11-01: 05:59Z is 01:59 EDT, 06:00Z is 01:00 EST.
  assert.equal(cityHourOf(new Date("2026-11-01T05:59:00Z")), 1 + 59 / 60);
  assert.equal(cityHourOf(new Date("2026-11-01T06:00:00Z")), 1);
});

test("the answer does not depend on the process time zone", () => {
  const script =
    'import { cityHourOf } from "./src/game/city/cityClock.ts";' +
    'console.log(cityHourOf(new Date("2026-07-15T16:30:00Z")));';
  for (const TZ of ["Asia/Tokyo", "UTC", "America/Los_Angeles"]) {
    const out = execFileSync(
      process.execPath,
      ["--input-type=module", "-e", script],
      { env: { ...process.env, TZ }, encoding: "utf8" },
    );
    assert.equal(out.trim(), "12.5", TZ);
  }
});
