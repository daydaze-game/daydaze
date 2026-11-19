// Instanced mesh kinds and instance placement types for the city renderer.

export const KINDS = [
  "road",
  "sidewalk",
  "ground",
  "lawn",
  "planks",
  "lane",
  "brick",
  "stucco",
  "concrete",
  "siding",
  "curtain",
  "band",
  "roof",
  "roofGravel",
  "roofSkin",
  "ledge",
  "glow",
  "awning",
  "sign",
  "tube",
  "pole",
  "lamp",
  "palmTrunk",
  "palmFrond",
  "treeTrunk",
  "treeCanopy",
  "window",
  "label",
  "panel",
  "arch",
  "bulb",
  "furniture",
  "glass",
  "puddle",
  "steam",
] as const;
export type Kind = (typeof KINDS)[number];

/** The materials a building's walls come in, one instanced mesh each. */
export const FACADE_KINDS = [
  "brick",
  "stucco",
  "concrete",
  "siding",
  "curtain",
] as const satisfies readonly Kind[];
export type FacadeKind = (typeof FACADE_KINDS)[number];

/** A unit mesh placed and scaled; `rot` is Euler XYZ-order YXZ in radians. */
export type Instance = {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  rot?: readonly [number, number, number];
  color?: string;
  /** Atlas rectangle for a label: u, v, width and height. */
  uv?: readonly [number, number, number, number];
};

export type Light = { x: number; y: number; z: number; color: string };

/** A street tree: the client draws one of the tree models here
 * (src/client/city/CityTrees.tsx); `variant` picks the model, `scale` and
 * `yaw` keep a row of them from looking cloned. */
export type TreeSpot = {
  x: number;
  z: number;
  variant: number;
  scale: number;
  yaw: number;
};
