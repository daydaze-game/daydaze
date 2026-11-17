# Textured dream-city landmarks

`dream-landmark-provenance.zip` preserves the original downloaded license files,
Sketchfab metadata, and SHA-256 hashes of every original source file. Source mesh
and image bytes remain in the owner's local architecture collection; the public
GLBs are optimized derivatives. No downloaded scripts are used.

Rebuild from the untouched downloads:

```sh
LANDMARK_SOURCE="$HOME/downloads/game/curated-world/architecture" \
LANDMARK_OUT=/tmp/dream-landmarks LANDMARK_PREVIEW=/tmp/dream-landmarks.png \
  nice -n 19 blender -b -t 2 --factory-startup \
  --python art/city/convert_dream_landmarks.py
nice -n 19 python art/city/pack_dream_landmarks.py /tmp/dream-landmarks
npx prettier --write src/game/city/dreamLandmarkCosts.generated.ts \
  public/models/city-dream/landmarks.generated.json
```

Inputs are three Sketchfab downloads, all CC-BY-4.0:

| Key | Title | Author | Source UID |
| --- | --- | --- | --- |
| palace | Majestic Victorian Mansion [Rapid Assets] | RapidAssets | cdd1a04e6c8b4a14b2681baf3c8fb66a |
| manor | FREE Fairytale Gothic Manor House | Hamanzz | 524cb97cc77541b99e225970efd8abe8 |
| clocktower | Whimsical Crimson Clocktower | Mutasim | 65e765a675eb4b3fab20e29a9c0fd02e |

The original PBR materials and UV layout are retained. Derivatives normalize
orientation and footprint, bake the clocktower's static pose, simplify near/far
meshes, resize textures to 1024/512 pixels and compress WebP/meshopt. Source hashes
and exact normalization, bounds, export counts, output hashes and sizes are in
`public/models/city-dream/landmarks.generated.json`. Entry facades face game +Z.
Each uses one material primitive. Parent integration owns the matching public
credits in `docs/assets.md` and `src/game/credits.ts`.
