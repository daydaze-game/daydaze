// The city's seasons and holidays follow the city's New York calendar date.
import { cityTime } from "./cityClock.ts";

export type Season = "winter" | "spring" | "summer" | "autumn";
export type Dressing =
  | "winter-holidays"
  | "halloween"
  | "autumn"
  | "summer"
  | "lunar-new-year"
  | "pride";

export function season(date: Date): Season {
  const t = cityTime(date);
  const day = t.month * 100 + t.day;
  if (day >= 1221 || day < 320) return "winter";
  if (day < 601) return "spring";
  if (day < 922) return "summer";
  return "autumn";
}

const lunarCalendar = new Intl.DateTimeFormat("en-u-ca-chinese", {
  month: "numeric",
  day: "numeric",
  timeZone: "UTC",
});

export function dressings(date: Date): Dressing[] {
  const { year, month, day } = cityTime(date);
  const md = month * 100 + day;
  const result: Dressing[] = [];
  if (md >= 922 && md <= 1130) result.push("autumn");
  if (md >= 1015 && md <= 1031) result.push("halloween");
  if (md >= 1201 || md <= 106) result.push("winter-holidays");
  if (md >= 601 && md <= 831) result.push("summer");
  if (month === 6) result.push("pride");
  // UTC noon represents the same calendar date regardless of the user's zone.
  const parts = lunarCalendar.formatToParts(
    new Date(Date.UTC(year, month - 1, day, 12)),
  );
  const lunarMonth = parts.find((part) => part.type === "month")?.value;
  const lunarDay = Number(parts.find((part) => part.type === "day")?.value);
  if (lunarMonth === "1" && lunarDay <= 15) result.push("lunar-new-year");
  return result;
}

export function parseDateFlag(search: string): Date | null {
  const value = new URLSearchParams(search).get("date");
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  // 17:00 UTC is noon or 1 pm in New York, so it is that date on the city clock.
  const date = new Date(Date.UTC(year, month - 1, day, 17));
  const t = cityTime(date);
  return t.year === year && t.month === month && t.day === day ? date : null;
}
