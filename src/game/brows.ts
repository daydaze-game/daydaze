// Eyebrow designs shared by the avatar's face painter and dressing-room previews.
import type { Look } from "./look.ts";

export type BrowDesign = {
  thickness: number;
  arch: number;
  tail: number;
  color: string;
  /** Optional peak along the inner 70% of the brow; legacy curves peak at 0.35. */
  peak?: number;
};

export const BROW_DESIGNS: Record<Look["brows"], BrowDesign> = {
  "brows-y2k-thin": {
    thickness: 0.009,
    arch: 0.024,
    tail: 0.006,
    color: "#24130e",
  },
  "brows-fox-snatched": {
    thickness: 0.014,
    arch: 0.014,
    tail: 0.03,
    color: "#26150f",
  },
  "brows-sculpted-espresso": {
    thickness: 0.019,
    arch: 0.022,
    tail: 0.004,
    color: "#22120c",
  },
  "brows-feathered-honey": {
    thickness: 0.02,
    arch: 0.016,
    tail: 0,
    color: "#5e3c22",
  },
  "brows-natural-straight": {
    thickness: 0.015,
    arch: 0,
    tail: 0,
    color: "#35231d",
  },
  "brows-soft-arch": {
    thickness: 0.014,
    arch: 0.012,
    tail: 0.002,
    color: "#3b271d",
  },
  "brows-full-straight": {
    thickness: 0.028,
    arch: 0,
    tail: 0,
    color: "#291b16",
  },
  "brows-rounded": {
    thickness: 0.016,
    arch: 0.025,
    tail: -0.003,
    color: "#39261e",
  },
  "brows-high-arch": {
    thickness: 0.014,
    arch: 0.036,
    tail: 0.005,
    color: "#291a16",
    peak: 0.45,
  },
  "brows-angled": {
    thickness: 0.018,
    arch: 0.026,
    tail: 0.008,
    color: "#302019",
    peak: 0.55,
  },
};

/** Natural eyebrow shade presets. Custom RGB colors are also supported. */
export const BROW_COLORS = [
  { id: "#1a120e", label: "Jet" },
  { id: "#24130e", label: "Espresso" },
  { id: "#35231d", label: "Dark brown" },
  { id: "#4a2d1d", label: "Chestnut" },
  { id: "#5e3c22", label: "Honey" },
  { id: "#7c4826", label: "Auburn" },
  { id: "#9e6c38", label: "Caramel" },
  { id: "#c29b63", label: "Blonde" },
  { id: "#d8c5a4", label: "Platinum" },
  { id: "#827d79", label: "Silver" },
] as const;

/** Resolves brow color: uses custom browColor if provided, else design default ink. */
export function browColor(look: {
  brows: Look["brows"];
  browColor?: string | undefined;
}): string {
  return look.browColor ?? BROW_DESIGNS[look.brows]?.color ?? "#302019";
}

/** Height above the eyelid, in the face painter's normalized coordinates. */
export function browRise(brow: BrowDesign, t: number): number {
  const peak = brow.peak;
  const arch =
    peak === undefined
      ? Math.sin(Math.PI * Math.min(t / 0.7, 1)) * (t < 0.7 ? 1 : 0)
      : t < peak
        ? Math.sin(((Math.PI / 2) * t) / peak)
        : t < 0.7
          ? Math.cos(((Math.PI / 2) * (t - peak)) / (0.7 - peak))
          : 0;
  return (
    0.046 + brow.arch * arch + brow.tail * t - (t > 0.7 ? (t - 0.7) * 0.05 : 0)
  );
}
