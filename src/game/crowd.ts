// The people in the game's crowds (club queues, far street walkers and
// cyclists, the stands and the pit crew): nine doll looks baked into static,
// single-mesh people by art/crowd/ (public/models/crowd/), each posed from the
// doll's own mocap clips. Pure data: the bake reads it through
// art/crowd/paint.ts, the client draws the files it names.

import { seededFace, type Face, type Figure, type Look } from "./look.ts";

export const CROWD_LOOKS = [
  "female-a",
  "female-b",
  "female-c",
  "female-d",
  "male-a",
  "male-b",
  "male-c",
  "male-d",
  "male-e",
] as const;
export type CrowdLook = (typeof CROWD_LOOKS)[number];

export const CROWD_POSES = [
  "idle",
  "cheer",
  "crouch",
  "walk-a",
  "walk-b",
  "ride",
] as const;
export type CrowdPose = (typeof CROWD_POSES)[number];

/** Near people (club queues, seen at the door) and far ones (stands, the
 * street crowd past the dolls, cyclists, the pit crew). */
export type CrowdTier = "near" | "far";

/** Triangle ceilings per baked person; budget.test.ts checks every file. */
export const CROWD_TRIS: Record<CrowdTier, number> = { near: 3000, far: 880 };

/** A crowd person: a full doll look, the seed that picks their face (as an
 * NPC doll's seed does), their build, and the clip they idle in. */
export type CrowdPerson = {
  look: Look;
  seed: number;
  figure: Figure;
  /** A mocap clip id (src/game/dance/mocap.ts) for the "idle" pose. */
  idle: string;
};

/** Varied in skin, build, hair and clothes, dressed like the city's NPCs.
 * male-d and male-e are the club bouncers (src/game/city/queues.ts). */
export const CROWD_PEOPLE: Record<CrowdLook, CrowdPerson> = {
  "female-a": {
    look: {
      skin: "#e6b48e",
      hairStyle: "bob",
      hairColor: "#4a2a1c",
      lips: "lips-nude-pink-gloss",
      brows: "brows-soft-arch",
      outfit: "jeans",
      outfitColor: "#ff2f9a",
      shadow: "#8a5a3c",
    },
    seed: 11,
    figure: "curvy",
    idle: "idle-female",
  },
  "female-b": {
    look: {
      skin: "#c49b72",
      hairStyle: "buns",
      hairColor: "#1b1014",
      lips: "lips-coral-pop",
      brows: "brows-sculpted-espresso",
      outfit: "sundress",
      outfitColor: "#ffb02e",
      shadow: "#ffb02e",
    },
    seed: 23,
    figure: "slim",
    idle: "idle-phone",
  },
  "female-c": {
    look: {
      skin: "#633c29",
      hairStyle: "afro",
      hairColor: "#1b1014",
      lips: "lips-burgundy-cherry",
      brows: "brows-fox-snatched",
      outfit: "cargo-crop",
      outfitColor: "#3fe0d0",
      shadow: "#ffb02e",
    },
    seed: 37,
    figure: "athletic",
    idle: "idle-weight-shift",
  },
  "female-d": {
    look: {
      skin: "#f3d4c4",
      hairStyle: "ponytail",
      hairColor: "#b77a3e",
      lips: "lips-peach-fizz",
      brows: "brows-feathered-honey",
      outfit: "hoodie-bikers",
      outfitColor: "#9b5cff",
      shadow: "#7b4dff",
    },
    seed: 41,
    figure: "plus",
    idle: "pose-legs-crossed",
  },
  "male-a": {
    look: {
      skin: "#d4ac8a",
      hairStyle: "crop",
      hairColor: "#241710",
      lips: "lips-bare-balm",
      brows: "brows-natural-straight",
      outfit: "denim-shirt",
      outfitColor: "#3a5a8a",
      shadow: "#8a5a3c",
      body: "masculine",
      beard: "stubble",
    },
    seed: 53,
    figure: "classic",
    idle: "idle-look-around",
  },
  "male-b": {
    look: {
      skin: "#94603f",
      hairStyle: "crew",
      hairColor: "#171310",
      lips: "lips-bare-balm",
      brows: "brows-full-straight",
      outfit: "overalls",
      outfitColor: "#b5502a",
      shadow: "#8a5a3c",
      body: "masculine",
    },
    seed: 67,
    figure: "athletic",
    idle: "idle-bored",
  },
  "male-c": {
    look: {
      skin: "#f3d4c4",
      hairStyle: "swept",
      hairColor: "#633e22",
      lips: "lips-bare-balm",
      brows: "brows-natural-straight",
      outfit: "striped-shirt",
      outfitColor: "#3a5a8a",
      shadow: "#8a5a3c",
      body: "masculine",
    },
    seed: 79,
    figure: "slim",
    idle: "idle-breathing",
  },
  "male-d": {
    look: {
      skin: "#633c29",
      hairStyle: "buzz",
      hairColor: "#171310",
      lips: "lips-bare-balm",
      brows: "brows-full-straight",
      outfit: "suit",
      outfitColor: "#141018",
      shadow: "#8a5a3c",
      body: "masculine",
      beard: "short",
    },
    seed: 83,
    figure: "plus",
    idle: "idle-fold-arms",
  },
  "male-e": {
    look: {
      skin: "#af7e63",
      hairStyle: "slick-back",
      hairColor: "#4c2519",
      lips: "lips-bare-balm",
      brows: "brows-full-straight",
      outfit: "white-tee",
      outfitColor: "#141018",
      shadow: "#8a5a3c",
      body: "masculine",
      beard: "full",
    },
    seed: 97,
    figure: "athletic",
    idle: "pose-waiting",
  },
};

/** Every pose but "idle" (which is each person's own clip): the clip it is
 * sampled from and when, as a share of the clip's length. */
export const POSE_CLIPS: Record<
  Exclude<CrowdPose, "idle">,
  { clip: string; at: number }
> = {
  cheer: { clip: "cheer", at: 0.3 },
  crouch: { clip: "kneel-fix", at: 0.3 },
  // the two strides of the street crowd's flip-book walk
  "walk-a": { clip: "walk-casual", at: 0 },
  "walk-b": { clip: "walk-casual", at: 0.5 },
  // seated, hands forward on the bars
  ride: { clip: "sit-at-table", at: 0 },
};

/** A crowd person's face: their seed's, with their build. */
export const crowdFace = (person: CrowdPerson): Face => ({
  ...seededFace(person.seed),
  figure: person.figure,
});

/** The baked file for a look in a pose. */
export const crowdUrl = (look: CrowdLook, pose: CrowdPose, tier: CrowdTier) =>
  `/models/crowd/${look}-${pose}-${tier}.glb`;

/** Fans in the stands: four looks, standing or cheering. */
export const FAN_LOOKS: readonly CrowdLook[] = [
  "male-a",
  "female-c",
  "male-d",
  "female-a",
];
/** The street crowd past the dolls: the same four, walking. */
export const WALKER_LOOKS = FAN_LOOKS;
/** Cyclists. */
export const RIDER_LOOKS: readonly CrowdLook[] = ["male-a", "female-c"];
/** The Speedway pit crew. */
export const CREW_LOOK: CrowdLook = "male-b";

/** Every file the game loads: what art/crowd/ bakes and budget.test.ts
 * checks. The queues (src/game/city/queues.ts) use each look's near idle. */
export const CROWD_BAKES: readonly {
  look: CrowdLook;
  pose: CrowdPose;
  tier: CrowdTier;
}[] = [
  ...CROWD_LOOKS.filter((look) => look !== CREW_LOOK).map((look) => ({
    look,
    pose: "idle" as const,
    tier: "near" as const,
  })),
  ...FAN_LOOKS.flatMap((look) =>
    (["idle", "cheer"] as const).map((pose) => ({
      look,
      pose,
      tier: "far" as const,
    })),
  ),
  ...WALKER_LOOKS.flatMap((look) =>
    (["walk-a", "walk-b"] as const).map((pose) => ({
      look,
      pose,
      tier: "far" as const,
    })),
  ),
  ...RIDER_LOOKS.map((look) => ({
    look,
    pose: "ride" as const,
    tier: "far" as const,
  })),
  { look: CREW_LOOK, pose: "crouch", tier: "far" },
];
