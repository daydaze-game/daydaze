// The city's one shared clock: every player sees New York time, whatever their
// own time zone, so the sky, pedestrians, events and shop hours agree. The zone
// lives in one constant so a later regional server can use its own. Pure.

/** The IANA time zone the whole city runs on (DST included). */
export const CITY_TIME_ZONE = "America/New_York";

/** A moment on the city clock. */
export type CityTime = {
  year: number;
  /** 1-12. */
  month: number;
  day: number;
  /** 0 is Sunday, like `Date.getDay()`. */
  weekday: number;
  hour: number;
  minute: number;
  second: number;
};

const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: CITY_TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  weekday: "short",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hourCycle: "h23",
});

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// One-entry cache: callers read the clock every frame, so format once a second.
let cachedSecond = Number.NaN;
let cached: Readonly<CityTime> | null = null;

/** `date` as the city clock shows it (the object is shared: do not mutate). */
export function cityTime(date: Date): Readonly<CityTime> {
  const second = Math.floor(date.getTime() / 1000);
  if (cached && second === cachedSecond) return cached;
  const parts = formatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? "";
  cachedSecond = second;
  cached = {
    year: Number(part("year")),
    month: Number(part("month")),
    day: Number(part("day")),
    weekday: WEEKDAYS.indexOf(part("weekday")),
    hour: Number(part("hour")),
    minute: Number(part("minute")),
    second: Number(part("second")),
  };
  return cached;
}

/** The city hour of `date`, with minutes as a fraction. */
export const cityHourOf = (date: Date): number => {
  const t = cityTime(date);
  return t.hour + t.minute / 60;
};

/** Seconds into the city day. */
export const citySecondsOf = (date: Date): number => {
  const t = cityTime(date);
  return t.hour * 3600 + t.minute * 60 + t.second;
};
