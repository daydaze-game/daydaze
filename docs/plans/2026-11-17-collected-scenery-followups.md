# Collected scenery: follow-up tasks

These are separate future tasks, not changes bundled into the landmark batch.
Start one worktree for one task, finish and verify it, merge, then remove that
worktree before starting another. The owner is actively working on main.

## Garden detail around distinct destinations

Tracked in [GitHub issue #10](https://github.com/dpologdvinity/daydaze/issues/10).

- Source: main checkout's `local-assets/downloads/game/curated-world/gardens/`.
- Inspect the manifest and actual previews. Candidates: wisteria flower clusters,
  ivy pergola, rose arch, hanging planter and window flower boxes.
- Verify individual licenses; some titles say CC0 while the actual license is
  CC-BY. Fix alpha materials before judging an import. Preserve the originals.
- Compose a few distinct entrances and courtyards; preserve doors, sidewalks,
  traffic, and the adult open-city tone in `docs/VISION.md`.
- Deliver reproducible optimized assets, exact budget costs, both credit
  ledgers, and actual day/night in-game screenshots. Keep low tier below
  250 draw calls/300k triangles and four real lights.

## Richer architectural surfaces

Tracked in [GitHub issue #12](https://github.com/dpologdvinity/daydaze/issues/12).

- Source: `gardens/materials/Metal058B`, `Metal058C`, plus the `textures/` and
  `textures-pbr/` collections under the same curated-world directory.
- The former are actual patinated copper textures; current authored roofs use
  painted surface colors. Review metal roughness, masonry scale and glass
  reflections in daylight before adding stronger night emission.
- Keep existing named surface flags in `architecture.glb` intact. Avoid more
  real lights or transparency layers. Verify shader compilation in the browser
  and compare arrival/day/night screenshots.

## Additional one-off architecture

Tracked in [GitHub issue #11](https://github.com/dpologdvinity/daydaze/issues/11).

- Source: `architecture/MANIFEST.md`, contact-sheet-2.png and contact-sheet-3.png.
- Candidates: steampunk shopfront, Victorian greenhouse, rotunda, selected
  Parisian facades. Some scans have open backs, broken edges or blank sides;
  a collected file is not an accepted runtime asset.
- Fit each building without stretching its proportions, retain characteristic
  rooflines across LODs, preserve existing venue doors, and avoid repeating a
  hero landmark across streets.
- Search the current asset ledger before adding duplicate downloads. Credit
  each source and adaptation, then inspect actual low-tier game renders.

Current source organization is documented in `docs/asset-inventory.md`. The
original city helper commits remain on `feat/dream-assets` and `feat/dream-plan`;
their inactive worktrees have been removed. A planner source-copy checkpoint is
in `local-assets/work-city-planner-checkpoint/`. These are references, not active
implementation tasks.
