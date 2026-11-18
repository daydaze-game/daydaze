# More face shapes — issue #42

Use the existing CC0 MakeHuman body and targets to broaden likeness choices.
Keep makeup optional and preserve all legacy save indices and brow curves.
Work sequentially in `feat/more-face-shapes`; merge only after green checks.

## Task 1: Eyebrows

- Add a failing look-validation regression for six appended brow IDs.
- Restore the parked brow increment, sharing painter and SVG preview curves.
- Check legacy curves, fallback textures, keyboard selection and persistence.
- Run focused brow/look/save tests, type and lint checks; commit.

## Task 2: Eyes and lips

- Test legacy literal save codes and round trips of narrow/open/soft-almond
  eyes and rounded/cupid/top-full/bottom-full lips, including RGB irises.
- Append catalog entries. Add real native targets in `build_doll.py`.
- Test all seven keys exist with nonzero position bounds on all four bodies;
  exported weights stay zero. Watch the asset regression fail before building.
- Rebuild both sexes using worktree-owned outputs; optimize only body GLBs.
- Generate previews from the actual runtime geometry; inspect differences.
- Run look/save/body tests and commit the native assets and reproducible source.

## Task 3: Review and land

- Add focused browser coverage for selecting and saving the new choices.
- Inspect desktop and phone studio captures, both bodies and varied skin tones.
- Open a draft PR, run full verify and touched-feature Playwright on CI.
- Obtain a fresh review, address material findings, merge and remove this worktree.

## Review focus

- Legacy codes must keep the same meaning when catalogs grow.
- Every new picker image must load and show the selected native feature.
- Eye changes must keep lids fitted to eyeballs; lip changes must stay closed.
- Brows must work with both the human painter and legacy texture fallback.
- Full RGB color and fine face sliders must survive changing presets.
