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

- [x] Build twelve distinct families: observatory, conservatory, palazzo,
      theater, ribbon, pagoda, heritage, shell, sail, storybook, lantern, terrace.
- [x] Model coordinates: x +/-10, z +/-8, ground y=0, body height 16;
      roof ornaments may reach y=26. Front faces +z. Ground-level center entry.
- [x] Single merged mesh per family, named family and family-lo; COLOR_0
      holds painted linear colors; TEXCOORD_0.x flags stone=0, metal=.25,
      glass=.5, foliage=.75, luminous=1. Preserve flags/names in optimization.
- [x] Near target 2k-7k triangles, far target 100-500. Generate exact cost map
      DREAM_MODEL_COST: Record<family, {tris:number;lo:number}> from exports.
- [x] Render a contact sheet and inspect the silhouettes before integration.

## Task 2: Pure city assignment and budget integration

Files: src/game/city/dream.ts, dream.test.ts, plan.ts, budget.ts, relevant tests.

- [x] Tests first: complete building coverage, deterministic assignment,
      distinct district/street signatures, venue overrides, finite transforms,
      aligned bounds, no old residential bodies under dream meshes, real budgets.
- [x] Export DREAM_KINDS, DreamKind, DreamSpot and dreamBuilding(b, from,
      detailRange). Spot contains id, kind, x,y,z,sx,sy,sz,yaw,color,far.
- [x] Select families coherently by district and location, curate spawn and
      recognizable venue facades. Use deterministic variation between streets.
- [x] CityPlan.dream holds replacements. Keep visible shop names and sign
      lights. Remove legacy building instances/bays/lots/houses/far from the
      active plan when replaced, retaining road/yard/street props.
- [x] trianglesOf/drawCallsOf include actual near/far architecture costs;
      adjust budget expectations only for intentional rendering changes.
- [x] Run focused planner, layout, budget tests and strict typecheck.

## Task 3: Renderer, visual review and handoff

Files: src/client/city/DreamBuildings.tsx, CityScene.tsx,
scripts/screenshots.ts, docs/assets.md, docs/VISION.md.

- [x] Instance each family/LOD with per-instance culling. Texture and weather
      stone, use metallic trim, sky-colored glass and restrained night emission.
- [x] Mount with an independent Suspense boundary. Stream updates from the
      city plan. Dispose owned geometries/materials and clear canvas readiness.
- [x] Capture arrival and representative streets, day/night, at low tier.
      Inspect every frame and revise weak silhouettes or blocked views.
- [x] Run relevant browser tests, focused unit tests, lint/typecheck/format;
      use GitHub verification for the full merge gate.
- [x] Prepare tested scenery-only merges, preserving the owner's edits; the
      foundation is on main and the landmark batch is ready with review images.

## Visual review refinement: detailed one-off landmarks

The first runtime review established varied silhouettes but still showed overly
smooth, simplified architecture. Add three textured landmarks from the owner's
new curated collection: a Gothic manor at the arrival avenue, a crimson
clocktower opposite it, and an ornate palace for Vesper Hotel. Preserve each
model's authored PBR textures, individual identity and a separate distant mesh.
Use verified CC-BY 4.0 sources, credit adaptations and retain source hashes.

- [x] Verify one unique address per detailed model and suppress its fallback
      family, with tests that fail before the replacement is implemented.
- [x] Convert, inspect, validate and record exact near/far geometry costs.
- [x] Include replacement triangle and primitive costs in the existing budget.
- [x] Review arrival day/night and palace screenshots; browser checks must wait
      for the expected landmarks to load before checking errors and render costs.

## Checkpoint: parked at the owner's request (2026-11-17)

All city work is preserved on `feat/dream-city` in `.worktrees/dream-city`.
The downloaded landmark source processing is also preserved separately on
`feat/dream-assets` in `.worktrees/dream-assets`. No city patch has been applied
to the main checkout, and no deployment or merge has been performed.

The base city at `b83671f7` passed full verification and browser checks. The
subsequent detailed-landmark integration is a work-in-progress checkpoint:
final exported assets and their generated costs are included, but final budget
checks, a fresh typecheck, in-game landmark screenshots, and review remain before
merging. The latest far palace is 4,849 triangles; use its generated cost rather
than the earlier provisional 999-triangle estimate. Preserve the owner's
independent avatar/UI work in the main checkout when resuming.

## Resumed review and integration (2026-11-17)

The owner authorized frequent commits/merges and one active worktree per task.
The foundation was merged and pushed as `b32a0477`, and its landing worktree
was removed. The three-landmark follow-up passed full verification on
`ci/dream-city-landmarks-ready`, browser tests on
`ci/dream-city-landmarks-review`, and all six final comparison screenshots
were inspected. A roof-extrema regression and uniform-placement regression
were each observed failing before the fixes, then passed.

See `docs/plans/2026-11-17-dream-city-review.md` for images and verification
links. Separate follow-ups are GitHub issues #10, #11 and #12, linked from
`docs/plans/2026-11-17-collected-scenery-followups.md`. The previous parked
checkpoint is historical; this batch has resumed and is ready to land.
