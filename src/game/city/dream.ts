// A celestial garden city's architectural vocabulary, fitted to the existing
// collision footprints. Fronts face +z in the source models, at ground y=0.
import type { Vec2 } from "../walk.ts";
import { BUILDINGS, type Building, type Neighborhood } from "./layout.ts";
import { facingOf } from "./dressing.ts";
import { hash } from "./hash.ts";

export const DREAM_KINDS = [
  "observatory",
  "conservatory",
  "palazzo",
  "theater",
  "ribbon",
  "pagoda",
  "heritage",
  "shell",
  "sail",
  "storybook",
  "lantern",
  "terrace",
] as const;
export type DreamKind = (typeof DREAM_KINDS)[number];

/** One-off textured landmarks; each is used at one authored address only. */
export const DREAM_LANDMARKS = [
  "palace",
  "manor",
  "clocktower",
  "greenhouse",
  "rotunda",
  "shopfront",
] as const;
export type DreamLandmark = (typeof DREAM_LANDMARKS)[number];
const DETAILED: Readonly<Record<string, DreamLandmark>> = {
  "vesper-hotel": "palace",
  "bus-shelter-block": "manor",
  "mural-wall": "clocktower",
  florist: "greenhouse",
  "arcade-square": "rotunda",
  "pawn-gadgets": "shopfront",
};

/** A single instanced model: a 20 by 16 m body, 16 m tall before its roof. */
export type DreamSpot = {
  id: string;
  kind: DreamKind;
  landmark?: DreamLandmark;
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  yaw: number;
  color: string;
  far: boolean;
};

/** Families overlap between neighboring districts, but each has its own mix. */
const FAMILIES: Record<Neighborhood, readonly DreamKind[]> = {
  downtown: ["observatory", "conservatory", "palazzo", "theater", "terrace"],
  "nightlife-row": ["ribbon", "theater", "lantern", "palazzo", "terrace"],
  beachside: ["shell", "sail", "conservatory", "terrace"],
  "little-manila": ["heritage", "conservatory", "lantern", "palazzo"],
  "arts-district": [
    "theater",
    "ribbon",
    "observatory",
    "conservatory",
    "heritage",
  ],
  "chinatown-koreatown": ["pagoda", "lantern", "ribbon", "terrace"],
  uptown: ["palazzo", "conservatory", "observatory", "terrace", "storybook"],
  suburbia: ["storybook", "conservatory", "heritage", "terrace"],
  fairground: ["lantern", "ribbon", "shell", "theater"],
};

const LANDMARKS: Readonly<Record<string, DreamKind>> = {
  "glass-tower": "observatory",
  "billboard-block": "lantern",
  "pixel-arcade": "theater",
  "parking-deck": "terrace",
  "exchange-block": "heritage",
  "arcade-square": "conservatory",
  "vesper-hotel": "palazzo",
  "noodle-lane": "pagoda",
  skydeck: "sail",
  "bus-shelter-block": "storybook",
  "mural-wall": "ribbon",
  "city-trust": "observatory",
  "pawn-gadgets": "heritage",
  "cine-noir": "theater",
  "thrift-house": "storybook",
  pulse: "ribbon",
  "sugar-rush-club": "theater",
  "karaoke-loft": "pagoda",
  bassline: "terrace",
  "city-jail": "heritage",
  "velvet-room": "palazzo",
  "la-noche": "lantern",
  "violet-hour": "conservatory",
  speakeasy: "storybook",
  skylark: "observatory",
  "glitter-bar": "shell",
  galleria: "palazzo",
  museum: "observatory",
  aquarium: "shell",
  florist: "conservatory",
  patisserie: "storybook",
  "wine-bar": "palazzo",
  bookshop: "storybook",
  "jazz-club": "theater",
  "hotel-rooftop": "sail",
  "carnival-gate": "lantern",
  "dome-gate": "observatory",
  "stadium-gate": "shell",
  "gridiron-gate": "ribbon",
};

const PEARL = ["#fff3e5", "#eee5ff", "#e0f7f1", "#ffe5ec", "#e6efff"];

/** Fixed assignments: prefer a street's palette while avoiding the same kind
 * on its nearest already-assigned neighbors. No view-dependent random picks. */
const ASSIGNED = (() => {
  const assigned = new Map<string, DreamKind>();
  const previous: { x: number; z: number; kind: DreamKind }[] = [];
  for (const b of [...BUILDINGS].sort((a, b) => a.id.localeCompare(b.id))) {
    const { front: f } = facingOf(b);
    const family = FAMILIES[b.neighborhood];
    const nearest = [...previous]
      .sort(
        (a, b) =>
          Math.hypot(a.x - f.cx, a.z - f.cz) -
          Math.hypot(b.x - f.cx, b.z - f.cz),
      )
      .filter((p) => Math.hypot(p.x - f.cx, p.z - f.cz) < 64)
      .slice(0, 3);
    const street = Math.floor(f.cx / 64) * 7 + Math.floor(f.cz / 64) * 13;
    const ranked = family
      .map((kind, i) => ({
        kind,
        score:
          nearest.reduce((n, p, k) => n + (p.kind === kind ? 4 - k : 0), 0) +
          hash(street, f.cx, f.cz, i),
      }))
      .sort((a, b) => a.score - b.score);
    const kind = LANDMARKS[b.id] ?? ranked[0]?.kind ?? "conservatory";
    assigned.set(b.id, kind);
    previous.push({ x: f.cx, z: f.cz, kind });
  }
  return assigned;
})();

/** Split a long frontage, centering the main module on its playable entry. */
function modules(
  width: number,
  entry: number,
): { lo: number; hi: number; main: boolean }[] {
  const half = width / 2;
  const centerWidth = Math.min(48, 2 * Math.min(entry + half, half - entry));
  const central = {
    lo: entry - centerWidth / 2,
    hi: entry + centerWidth / 2,
    main: true,
  };
  const result = [central];
  for (const [lo, hi] of [
    [-half, central.lo],
    [central.hi, half],
  ]) {
    const count = Math.ceil((hi - lo) / 48);
    for (let i = 0; i < count; i++)
      result.push({
        lo: lo + ((hi - lo) * i) / count,
        hi: lo + ((hi - lo) * (i + 1)) / count,
        main: false,
      });
  }
  return result.filter((m) => m.hi - m.lo > 1e-6).sort((a, b) => a.lo - b.lo);
}

/** Fit every body to the collider; wide landmarks become a central hall and
 * wings. Only roof decoration extends above the old body. Distance is to each
 * module's body, so an entry stays detailed when its far wing switches LOD. */
export function dreamBuilding(
  b: Building,
  from: Vec2,
  detailRange: number,
): DreamSpot[] {
  const { front: f, yaw: facingYaw } = facingOf(b);
  const yaw = facingYaw + (f.out1 < 0 ? Math.PI : 0);
  const cos = Math.cos(yaw),
    sin = Math.sin(yaw);
  const entry = b.door
    ? (b.door.position[0] - f.cx) * cos - (b.door.position[1] - f.cz) * sin
    : 0;
  const kind =
    ASSIGNED.get(b.id) ?? FAMILIES[b.neighborhood][0] ?? "conservatory";
  return modules(f.w, entry).map((m, i) => {
    const offset = (m.lo + m.hi) / 2;
    const x = f.cx + offset * cos,
      z = f.cz - offset * sin;
    const width = m.hi - m.lo,
      depth = f.z1 - f.z0;
    const dx = (from[0] - x) * cos - (from[1] - z) * sin;
    const dz = (from[0] - x) * sin + (from[1] - z) * cos;
    const away = Math.hypot(
      Math.max(0, Math.abs(dx) - width / 2),
      Math.max(0, Math.abs(dz) - depth / 2),
    );
    return {
      id: `${b.id}:${i}`,
      kind,
      ...(m.main && DETAILED[b.id] && { landmark: DETAILED[b.id] }),
      x,
      y: 0.14,
      z,
      sx: width / 20,
      sy: (Math.min(b.height, 40) / 16) * (m.main ? 1 : 0.86),
      sz: depth / 16,
      yaw,
      color: PEARL[Math.floor(hash(f.cx, f.cz) * PEARL.length)] ?? "#fff3e5",
      far: detailRange <= 0 || away >= detailRange,
    };
  });
}

/** Preserve the downloaded proportions and keep its front at the street edge. */
export function landmarkPlacement(spot: DreamSpot) {
  const scale = Math.min(spot.sx, spot.sz);
  const forward = (spot.sz - scale) * 8;
  return {
    x: spot.x + Math.sin(spot.yaw) * forward,
    y: spot.y,
    z: spot.z + Math.cos(spot.yaw) * forward,
    scale,
  };
}
