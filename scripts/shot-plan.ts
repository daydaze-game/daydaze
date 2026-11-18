// The screenshot token language (scripts/screenshots.ts and screenshots.yml).
// `shots` is a space-separated list of tokens, each one of:
//
//   yacht                       a registry name (SHOTS in screenshots.ts)
//   room=city&at=10,5&yaw=1.57  a raw query, any client URL flags (has "=")
//   all-rooms                   a preset: room=<id> for every room
//   all-spots                   a preset: spot=<id>&view=full for every door
//   tour                        all-rooms plus all-spots
//
// A query token may carry script-only params, stripped before the page loads:
//   name=<slug>   the output file name (else a slug of the query)
//   turn=N        N shots at evenly spaced yaws, named <slug>-NN (needs at= or spot=)
//   w=..&h=..     the viewport, e.g. w=1920&h=1080 with quality=high for docs
//
// For the workflow, `scripts/screenshots.ts --matrix "<tokens>" <shards>`
// prints the shards (it owns the registry), and
//   node --experimental-strip-types scripts/shot-plan.ts --gallery <dir> <ref> <sha>
//     writes <dir>/README.md: a grid of <dir>/*.{png,jpg} with <dir>/stats.jsonl numbers
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { mayEnter } from "../src/game/age.ts";
import { BUILDINGS } from "../src/game/city/layout.ts";
import { spotFor } from "../src/game/city/spots.ts";
import { ROOMS, isRoomId } from "../src/game/rooms.ts";

/** One shot to take: a registry name, or a query with its own name. */
export type PlannedShot = {
  name: string;
  /** The canonical token: expanding it again gives back this one shot. */
  token: string;
  /** Client URL flags, script-only params removed; absent for registry shots. */
  query?: string;
  viewport?: { width: number; height: number } | undefined;
};

/** Characters a query token may use: no spaces, quotes or shell globs. */
const QUERY_CHARS = /^[a-z0-9=&,.:_-]+$/;
const NAME = /^[a-z0-9-]+$/;
const MAX_TURN = 36;

/** The preset tokens, expanded to query tokens. */
function preset(token: string): string[] | null {
  const rooms = () =>
    Object.keys(ROOMS)
      .filter(isRoomId)
      // 18+ venues stay out of the public gallery
      .filter((id) => mayEnter(id, false))
      .map((id) => `name=tour-room-${id}&room=${id}`);
  const spots = () =>
    BUILDINGS.filter((b) => b.door).map(
      (b) => `name=tour-spot-${b.id}&spot=${b.id}&view=full`,
    );
  if (token === "all-rooms") return rooms();
  if (token === "all-spots") return spots();
  if (token === "tour") return [...rooms(), ...spots()];
  return null;
}

const slug = (query: string) =>
  query.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** `key=value` pairs, in order; flag values never need escaping here. */
const join = (params: ReadonlyMap<string, string>) =>
  [...params].map(([k, v]) => `${k}=${v}`).join("&");

/** Expands one query token; throws with the reason it is rejected. */
function expandQuery(token: string): PlannedShot[] {
  if (!QUERY_CHARS.test(token))
    throw new Error(`only [a-z0-9=&,.:_-] are allowed`);
  const params = new Map<string, string>();
  for (const pair of token.split("&")) {
    const match = /^([a-z]+)=([^=]*)$/.exec(pair);
    if (!match?.[1]) throw new Error(`"${pair}" is not key=value`);
    params.set(match[1], match[2] ?? "");
  }
  const name = params.get("name");
  const turn = params.get("turn");
  const w = params.get("w");
  const h = params.get("h");
  for (const k of ["name", "turn", "w", "h"]) params.delete(k);
  const query = join(params);
  if (!query) throw new Error("no client flags");
  const spot = params.has("spot") ? spotFor(params.get("spot") ?? "") : null;
  if (params.has("spot") && !spot) throw new Error("no building with that id");
  if (name !== undefined && !NAME.test(name))
    throw new Error(`name must be [a-z0-9-]`);
  let viewport: PlannedShot["viewport"];
  if (w !== undefined || h !== undefined) {
    const width = Number(w);
    const height = Number(h);
    const ok = (n: number) => Number.isInteger(n) && n >= 320 && n <= 3840;
    if (!ok(width) || !ok(height))
      throw new Error("w and h go together, 320 to 3840");
    viewport = { width, height };
  }
  const size = viewport ? `&w=${viewport.width}&h=${viewport.height}` : "";
  const base = name ?? slug(query);
  if (turn === undefined)
    return [
      { name: base, token: `name=${base}&${query}${size}`, query, viewport },
    ];
  const n = Number(turn);
  if (!Number.isInteger(n) || n < 1 || n > MAX_TURN)
    throw new Error(`turn must be 1 to ${MAX_TURN}`);
  // the client reads yaw only with a spawn spot
  if (!params.has("at") && !params.has("spot"))
    throw new Error("turn needs at= or spot=");
  // from the given heading, else the spot's own, so -00 is the usual framing
  const start = Number(params.get("yaw") ?? spot?.yaw ?? 0);
  if (!Number.isFinite(start)) throw new Error("yaw is not a number");
  return Array.from({ length: n }, (_, i) => {
    const turned = new Map(params);
    turned.set("yaw", (start + (i * 2 * Math.PI) / n).toFixed(3));
    const q = join(turned);
    const shotName = `${base}-${String(i).padStart(2, "0")}`;
    return {
      name: shotName,
      token: `name=${shotName}&${q}${size}`,
      query: q,
      viewport,
    };
  });
}

/**
 * Expands shot tokens (presets, turns) into shots, first one per name.
 * Throws one error listing every unknown name or rejected token.
 */
export function expandShots(
  tokens: readonly string[],
  isRegistered: (name: string) => boolean,
): PlannedShot[] {
  const shots = new Map<string, PlannedShot>();
  const errors: string[] = [];
  const add = (shot: PlannedShot) => {
    if (!shots.has(shot.name)) shots.set(shot.name, shot);
  };
  for (const token of tokens.flatMap((t) => preset(t) ?? [t])) {
    if (!token.includes("=")) {
      if (isRegistered(token)) add({ name: token, token });
      else errors.push(`${token}: no such shot or preset`);
      continue;
    }
    try {
      expandQuery(token).forEach(add);
    } catch (e) {
      errors.push(`${token}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (errors.length) throw new Error(`bad shots:\n  ${errors.join("\n  ")}`);
  return [...shots.values()];
}

/** Deals shots round-robin into at most `shards` non-empty chunks. */
export function shard(
  shots: readonly PlannedShot[],
  shards: number,
): string[][] {
  const n = Math.max(1, Math.min(Math.floor(shards) || 1, shots.length));
  const chunks: string[][] = Array.from({ length: n }, () => []);
  shots.forEach((s, i) => chunks[i % n]?.push(s.token));
  return chunks.filter((c) => c.length);
}

/** Renderer numbers screenshots.ts logs per shot (stats.jsonl lines). */
export type ShotStats = {
  name: string;
  frames: number;
  calls: number;
  triangles: number;
  seconds: number;
};

const GROUPS: readonly { title: string; prefix: string }[] = [
  { title: "Rooms", prefix: "tour-room-" },
  { title: "City spots", prefix: "tour-spot-" },
  { title: "Other shots", prefix: "" },
];

/** The gallery README: a two-column grid of images per group, with numbers. */
export function galleryMarkdown(
  files: readonly string[],
  stats: readonly ShotStats[],
  meta: { ref: string; sha: string; repo: string; time: string },
): string {
  const byName = new Map(stats.map((s) => [s.name, s]));
  const images = files.filter((f) => /\.(png|jpg)$/.test(f)).sort();
  const lines = [
    `# Screenshots: ${meta.ref}`,
    "",
    `Commit [\`${meta.sha.slice(0, 7)}\`](https://github.com/${meta.repo}/commit/${meta.sha}), taken ${meta.time}. ${images.length} images, low tier unless the name says otherwise.`,
  ];
  const left = new Set(images);
  for (const { title, prefix } of GROUPS) {
    const group = images.filter((f) => left.has(f) && f.startsWith(prefix));
    if (!group.length) continue;
    group.forEach((f) => left.delete(f));
    lines.push(
      "",
      `## ${title} (${group.length})`,
      "",
      "| | |",
      "| --- | --- |",
    );
    const cells = group.map((f) => {
      const name = f.replace(/\.(png|jpg)$/, "");
      const s = byName.get(name);
      const numbers = s
        ? `<br>${s.calls} calls, ${Math.round(s.triangles / 1000)}k triangles`
        : "";
      return `<a href="${f}"><img src="${f}" alt="${name}"></a><br>\`${name.slice(prefix.length)}\`${numbers}`;
    });
    for (let i = 0; i < cells.length; i += 2)
      lines.push(`| ${cells[i]} | ${cells[i + 1] ?? ""} |`);
  }
  return `${lines.join("\n")}\n`;
}

/** Parses stats.jsonl, skipping lines that are not ShotStats. */
export function parseStats(text: string): ShotStats[] {
  const out: ShotStats[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const v: unknown = JSON.parse(line);
      if (
        typeof v === "object" &&
        v !== null &&
        "name" in v &&
        typeof v.name === "string" &&
        "frames" in v &&
        typeof v.frames === "number" &&
        "calls" in v &&
        typeof v.calls === "number" &&
        "triangles" in v &&
        typeof v.triangles === "number" &&
        "seconds" in v &&
        typeof v.seconds === "number"
      )
        out.push({
          name: v.name,
          frames: v.frames,
          calls: v.calls,
          triangles: v.triangles,
          seconds: v.seconds,
        });
    } catch {
      // a half-written line from a killed shard: skip it
    }
  }
  return out;
}

if (import.meta.main) {
  const [mode, a = "", b = "", c = ""] = process.argv.slice(2);
  if (mode === "--gallery") {
    let stats = "";
    try {
      stats = readFileSync(`${a}/stats.jsonl`, "utf8");
    } catch {
      // no stats: every shot failed before logging, show the images alone
    }
    writeFileSync(
      `${a}/README.md`,
      galleryMarkdown(readdirSync(a), parseStats(stats), {
        ref: b,
        sha: c,
        repo: process.env.GITHUB_REPOSITORY ?? "dpologdvinity/daydaze",
        time: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
      }),
    );
  } else {
    console.error("usage: shot-plan.ts --gallery <dir> <ref> <sha>");
    process.exit(2);
  }
}
