// The crowd bake's first step, run in a browser by art/crowd/paint-run.ts: paints
// each crowd person's face and irises with the game's own painter
// (faceCanvas.ts) and writes the recipe build_crowd.py follows (parts, shape
// keys, tints, poses), so the baked people match the live dolls.
import { GLTFLoader, MeshoptDecoder } from "three-stdlib";
import {
  acquireFace,
  acquireIris,
  readMarks,
  type Marks,
} from "../../src/client/avatar/human/faceCanvas.ts";
import { DEFAULT_BODY, dollShapeKeys } from "../../src/game/body.ts";
import {
  CROWD_BAKES,
  CROWD_LOOKS,
  CROWD_PEOPLE,
  CROWD_TRIS,
  POSE_CLIPS,
  type CrowdPerson,
} from "../../src/game/crowd.ts";
import { MOCAP_CLIPS } from "../../src/game/dance/mocap.ts";
import { packFile } from "../../src/client/avatar/human/anims.ts";
import {
  DEFAULT_MAKEUP,
  encodeFace,
  encodeMakeup,
  modelSuffix,
  seededFace,
  seededMakeup,
  type Face,
  shoesOf,
} from "../../src/game/look.ts";

/** The face landmarks the doll's body carries in its glTF extras. */
async function marksOf(suffix: string): Promise<Marks> {
  const gltf = await new GLTFLoader()
    .setMeshoptDecoder(MeshoptDecoder())
    .loadAsync(`/models/doll/body${suffix}.glb`);
  let marks: Marks | null = null;
  gltf.scene.traverse((o) => {
    marks ??= readMarks(o.userData.doll);
  });
  if (!marks) throw new Error(`body${suffix}.glb has no face landmarks`);
  return marks;
}

/** A crowd person's face: their seed's, as an NPC doll's, with their build. */
const crowdFace = (person: CrowdPerson): Face => ({
  ...seededFace(person.seed),
  figure: person.figure,
});

const png = (canvas: unknown): string => {
  if (!(canvas instanceof HTMLCanvasElement))
    throw new Error("the painter did not draw on a canvas");
  return canvas.toDataURL("image/png").split(",")[1] ?? "";
};

/** Every look's recipe, and its face and iris PNGs (base64) by file name. */
async function paint() {
  const marks = { "": await marksOf(""), "-m": await marksOf("-m") };
  const images: Record<string, string> = {};
  const looks: Record<string, unknown> = {};
  for (const id of CROWD_LOOKS) {
    const person = CROWD_PEOPLE[id];
    const { look } = person;
    const m = modelSuffix(look);
    const face = crowdFace(person);
    // as HumanDoll paints an NPC: the seed's face and polished makeup
    const painted = acquireFace(
      {
        skin: look.skin,
        lips: look.lips,
        brows: look.brows,
        shadow: look.shadow,
        // men bare-faced: NPC makeup reads as blush and lid color on them
        makeup: encodeMakeup(
          look.body === "masculine" ? DEFAULT_MAKEUP : seededMakeup(person.seed),
        ),
        beard: look.beard,
        hairColor: look.hairColor,
        body: look.body,
        face: encodeFace(face),
      },
      marks[m],
      `crowd${m}`,
    );
    images[`${id}-face.png`] = png((await painted.texture).image);
    images[`${id}-iris.png`] = png(acquireIris(face.eyeColor).image);
    const shoes = shoesOf(look);
    looks[id] = {
      suffix: m,
      // HumanDoll's partsFor, for the hair styles crowds wear
      hair: `hair-${look.hairStyle}${m}.glb`,
      outfit: `outfit-${look.outfit}${m}.glb`,
      shoes: `shoes-${shoes}${m}.glb`,
      tucks: [`tuck_${look.outfit}`, `tuck_${shoes}`],
      keys: Object.fromEntries(dollShapeKeys(face, DEFAULT_BODY)),
      hairColor: look.hairColor,
      outfitColor: look.outfitColor,
      // HumanDoll's shoe tint: sneakers keep their colors, the rest take
      // the outfit's
      shoesColor:
        shoes === "sneakers"
          ? "#ffffff"
          : look.outfit === "mini"
            ? "#f6e7ff"
            : look.outfitColor,
      idle: person.idle,
    };
  }
  // the doll's clip file each pose's clip lives in, per skeleton
  const clips = Object.fromEntries(
    MOCAP_CLIPS.map((c) => [
      c.id,
      { "": packFile("", c.pack), "-m": packFile("-m", c.pack) },
    ]),
  );
  return {
    recipe: {
      looks,
      poses: POSE_CLIPS,
      bakes: CROWD_BAKES,
      tris: CROWD_TRIS,
      clips,
    },
    images,
  };
}

Object.assign(window, { paint });
document.body.dataset.ready = "true";
