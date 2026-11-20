# Human character follow-up

## Work queue

- [Crowd replacement #13](https://github.com/dpologdvinity/daydaze/issues/13): done. The crowds are baked doll people (`art/crowd/`).
- [Clothing clipping #14](https://github.com/dpologdvinity/daydaze/issues/14): skin pokes through the default flared pants. Root cause remains unconfirmed.
- [Dependency alerts #15](https://github.com/dpologdvinity/daydaze/issues/15): unrelated security maintenance; no dependency changes belong in the avatar task.
- The owner's requested eyebrow/eye/lip additions are the next separate task. Partial eyebrow work is preserved at `64f3cd90` on `feat/face-shapes`; it is not part of the initial editor merge.

The current customizable base still does not match the owner's AAA references.
Read `docs/plans/2026-11-14-natural-characters.md` before choosing replacement
sources. Keep the owner's reference images and downloaded models intact.
The owner wants one active worktree per agent: finish, test, commit, merge, and
remove it before starting the next task. Open GitHub issues for unrelated findings.

## Rejected crowd experiments

Superseded by `art/crowd/` (see its README); kept as a record.

The `.txt` source attachments are diagnostic recipes, not runtime assets or an
approved production pipeline. Copy them into an ignored `tmp/crowd-study/`
directory with the `.txt` suffix removed before using them.

The first bake used 857 triangles and destroyed too much face and hair detail.
The second used 2,941 triangles (body 1,200; eyes 120; hair 800; outfit 650;
shoes 180 ceilings). It still showed hair/atlas artifacts and clothing clipping.
Neither prototype is shipped. Both use existing CC0 MakeHuman assets and the
game's own face painter, not the downloaded artist heads.

A sampled city-budget calculation replaced the existing queue cost with 3,000
triangles per person at the existing 80m radius. The sampled maximum was
267,330 triangles at `[112, 0]`, with 27 queued people. This supports exploring
more detailed queues without immediately reducing their radius. It is a model
of triangle cost, not GPU evidence or visual approval. Re-run the full budget
tests and inspect game renders before admitting any new crowd models.

## Reproduce in a new worktree

1. Use the MakeHuman source in `art/doll/blender/.cache/mh`, fetched by
   `fetch_makehuman.sh`, and the skin source described in `SKIN.md`. Run
   `build_doll.py` with `OUTFIT_ONLY=1` for both body builds to produce the
   raw bodies and fitted outfits in the worktree's own `.cache/out/`.
   The prototype also needs the chosen raw hair files; rebuild those or obtain
   uncompressed copies from the matching shipped assets. Do not point writable
   outputs at another agent's checkout or shared cache.
2. Copy the attached painter files into `tmp/crowd-study/`. Extract each body's
   node `extras.doll` JSON string from the raw GLB JSON chunk into
   `tmp/crowd-study/marks.json`, under `feminine` and `masculine` keys.
3. Start a worktree-specific Vite server on port 5217 with a separate
   `VITE_CACHE_DIR`. The attached `paint.mjs` uses Playwright without rendering
   a 3D world: it calls the existing face painter and saves the source PNGs.
4. Run the copied Python recipe with Blender in background/factory mode, low
   priority, and limited threads. `ONLY` selects look IDs and `POSES` selects
   baked poses. Its outputs stay under `tmp/crowd-study/out/`.
5. Inspect atlas alpha/UV handling, hair coverage, facial detail, real height,
   and garment occlusion. The prototype's hardcoded 0.4 scale preserves the
   client `PERSON_SCALE=2.5` of the time (gone since; the crowd is baked at real size).

Do not promote a model just because the bake/export succeeds or its triangle
count passes. Resolve the visible defects first, then record provenance,
credits, optimization, loader requirements, and browser/budget verification.
