# Crowd people

The crowds (club queues, the street's far walkers and cyclists, the arena
and Speedway stands, the pit crew) are the game's own doll, baked into
static single-mesh people: one GLB per look, pose and tier in
`public/models/crowd/`. The looks, poses and file list live in
`src/game/crowd.ts`.

## Build

```sh
bash art/crowd/build-crowd.sh                       # every file
bash art/crowd/build-crowd.sh female-a-idle-near    # just these
```

It needs Blender 5.x, Node and `uv`. The steps are:

1. `paint-run.ts` opens `paint.html` in headless Chromium on a throwaway Vite
   server. The page paints each look's face and irises with the doll's
   painter (`faceCanvas.ts`) and writes them, with `recipe.json` (parts,
   shape keys from `dollShapeKeys`, tints, clips), into `.cache/`.
2. `build_crowd.py` (Blender) dresses the doll from the shipped
   `public/models/doll/` parts and poses it from one frame of a doll clip. It
   freezes that as flat emission materials holding the game's colors, then
   solidifies and voxel-remeshes it into one closed surface. Skin under
   clothes and the gaps in hair cards vanish, so nothing clips. It collapses
   that to the tier's ceiling (3,000 near, 880 far), with the face spared,
   and charts the UVs with xatlas, giving the face extra texels. Last, it
   Cycles-bakes the source onto the result, selected to active, so each
   texel takes the outermost surface.
3. gltf-transform compresses each bake (meshopt, WebP at 512 px near and
   256 px far).

`preview.py` renders bakes from the front, side and back for a quick look.
`budget.test.ts` checks that every file is one primitive within its ceiling.

The two prototypes in `docs/agents/investigations/natural-characters/` were
rejected for nearest-sampled 128 px tiles, clamped UVs, white atlas bleed,
and per-part decimation that let skin poke through. This pipeline replaces
them.
