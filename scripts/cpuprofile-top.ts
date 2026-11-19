// Summarizes a V8 .cpuprofile: top functions by self time, with file:line.
// Usage: node --experimental-strip-types scripts/cpuprofile-top.ts file.cpuprofile [count]
import { readFileSync } from "node:fs";

type Node = {
  id: number;
  callFrame: { functionName: string; url: string; lineNumber: number };
};
type Profile = { nodes: Node[]; samples: number[]; timeDeltas: number[] };

/** Shallow shape check: the three arrays this script reads (nodes are trusted). */
function isProfile(value: unknown): value is Profile {
  return (
    typeof value === "object" &&
    value !== null &&
    "nodes" in value &&
    Array.isArray(value.nodes) &&
    "samples" in value &&
    Array.isArray(value.samples) &&
    "timeDeltas" in value &&
    Array.isArray(value.timeDeltas)
  );
}

const file = process.argv[2];
if (!file) throw new Error("usage: cpuprofile-top.ts file.cpuprofile [count]");
const top = Number(process.argv[3] ?? 25);
const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
if (!isProfile(parsed)) throw new Error(`${file} is not a .cpuprofile`);
const profile = parsed;
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const self = new Map<string, number>();
let total = 0;
profile.samples.forEach((id, i) => {
  const dt = profile.timeDeltas[i] ?? 0;
  const f = byId.get(id)?.callFrame;
  if (!f) return;
  const key = `${f.functionName || "(anon)"} ${f.url.split("/").pop() ?? ""}:${f.lineNumber + 1}`;
  self.set(key, (self.get(key) ?? 0) + dt);
  total += dt;
});
const idle = [...self].find(([k]) => k.startsWith("(idle)"))?.[1] ?? 0;
console.log(
  `total ${(total / 1000).toFixed(0)} ms, idle ${(idle / 1000).toFixed(0)} ms`,
);
for (const [k, v] of [...self].sort((a, b) => b[1] - a[1]).slice(0, top))
  console.log(`${(v / 1000).toFixed(0).padStart(6)} ms  ${k}`);
