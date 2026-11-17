# Dream city implementation plan

> Execution: use superpowers:executing-plans, with independent asset and pure
> planner tasks delegated under superpowers:dispatching-parallel-agents.

**Goal:** Replace apartment-like repetition with a glamorous, fantastical city
whose streets have distinct silhouettes and inviting destinations.

**Design:** The owner delegated art direction ("Use your judgement"). Use a
celestial garden city rather than medieval fantasy: layered limestone,
oxidized copper, gilded ribs, arched glazing, unusual roofs, rich foliage,
theatrical nightlife and pearlescent coast architecture. Geometry and
composition must carry this in daylight. Existing venues keep their doors,
routes and names. The arrival view gets a deliberate landmark composition.

**Approaches:** Recoloring existing packs leaves the same silhouettes.
Scattering unrelated fantasy props leaves ordinary apartment blocks dominant.
Chosen: replace the building vocabulary throughout the map with authored
architectural families, with curated venue landmarks and stable street-level
variation. Reuse existing CC0 vegetation and textured materials; build the
missing architecture in reproducible Blender scripts after searching free
assets. No paid generation services.

**Architecture:** Pure building assignments and transforms feed instanced
Blender meshes with detailed and distant twins. Both near buildings and the
skyline use the new vocabulary. One shader/material with vertex surface flags
provides textured stone, metal, glass and night lighting. The planner accounts
for actual asset triangles and draw calls. Keep legacy helpers testable but
do not draw their apartment walls under the replacements.

**Spec:** `docs/specs/2026-11-14-dream-city.md`

**Tech:** Existing TypeScript, R3F/three.js, Blender, meshopt. No dependencies.

## Global constraints

- Preserve the owner's uncommitted avatar/UI changes in the main checkout.
- Low tier: under 250 draw calls, under 300k triangles, at most 4 real lights.
- No allocation in useFrame; reduced motion respected; local checks at nice 19.
- No changes to online rules, venues, ages, traffic routes or spawn safety.
- All assets reproducible, recorded in docs/assets.md and credits where needed.
- Every source file has a header; strict TypeScript; test-first pure logic.

## Review focus

- Arrival and every district must remain distinct at noon as well as at night.
- Buildings must meet the ground and preserve reachable, visible venue doors.
- Distant silhouettes must retain identity, without overlapping duplicate walls.
- Street assignment must be deterministic and avoid neighboring clones.
- Real geometry counts, streamed assets and low-tier budget must match runtime.

## Task 1: Authored architecture library

Files: art/city/build_dream_city.py, public/models/city-dream/architecture.glb,
src/game/city/dreamCosts.generated.ts.

- [ ] Build twelve distinct families: observatory, conservatory, palazzo,
  theater, ribbon, pagoda, heritage, shell, sail, storybook, lantern, terrace.
- [ ] Model coordinates: x +/-10, z +/-8, ground y=0, body height 16;
  roof ornaments may reach y=26. Front faces +z. Ground-level center entry.
- [ ] Single merged mesh per family, named family and family-lo; COLOR_0
  holds painted linear colors; TEXCOORD_0.x flags stone=0, metal=.25,
  glass=.5, foliage=.75, luminous=1. Preserve flags/names in optimization.
- [ ] Near target 2k-7k triangles, far target 100-500. Generate exact cost map
  DREAM_MODEL_COST: Record<family, {tris:number;lo:number}> from exports.
- [ ] Render a contact sheet and inspect the silhouettes before integration.

## Task 2: Pure city assignment and budget integration

Files: src/game/city/dream.ts, dream.test.ts, plan.ts, budget.ts, relevant tests.

- [ ] Tests first: complete building coverage, deterministic assignment,
  distinct district/street signatures, venue overrides, finite transforms,
  aligned bounds, no old residential bodies under dream meshes, real budgets.
- [ ] Export DREAM_KINDS, DreamKind, DreamSpot and dreamBuilding(b, from,
  detailRange). Spot contains id, kind, x,y,z,sx,sy,sz,yaw,color,far.
- [ ] Select families coherently by district and location, curate spawn and
  recognizable venue facades. Use deterministic variation between streets.
- [ ] CityPlan.dream holds replacements. Keep visible shop names and sign
  lights. Remove legacy building instances/bays/lots/houses/far from the
  active plan when replaced, retaining road/yard/street props.
- [ ] trianglesOf/drawCallsOf include actual near/far architecture costs;
  adjust budget expectations only for intentional rendering changes.
- [ ] Run focused planner, layout, budget tests and strict typecheck.

## Task 3: Renderer, visual review and handoff

Files: src/client/city/DreamBuildings.tsx, CityScene.tsx,
scripts/screenshots.ts, docs/assets.md, docs/VISION.md.

- [ ] Instance each family/LOD with per-instance culling. Texture and weather
  stone, use metallic trim, sky-colored glass and restrained night emission.
- [ ] Mount with an independent Suspense boundary. Stream updates from the
  city plan. Dispose owned geometries/materials and clear canvas readiness.
- [ ] Capture arrival and representative streets, day/night, at low tier.
  Inspect every frame and revise weak silhouettes or blocked views.
- [ ] Run relevant browser tests, focused unit tests, lint/typecheck/format;
  use GitHub verification for the full merge gate.
- [ ] Integrate only the scenery files into the owner's checkout, preserving
  existing edits; provide review screenshots and report verification limits.
