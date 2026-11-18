# Natural character faces implementation plan

> Execute inline with the executing-plans skill. The visual target is the owner's CGTrader references in `tmp/ref`, not fashion-doll proportions.

**Goal:** Glamorous people with natural facial anatomy, detailed skin, and optional, removable makeup across skin tones.

## Current visual status and owner feedback

The implementation work below has not achieved the owner's visual target.
Do not treat its completed tasks or verification record as visual approval.
The owner reconsidered GaminRots' Sketchfab "Realistic Woman character"
(`f3f94fe3068f44d29ad059d3cbe4c21a`) and wants to keep it as a candidate for
a fuller body type. Preserve the downloaded source. This reverses the earlier
rejection; it does not establish that its face is the target or that the model
is ready for integration. The supplied CGTrader examples and images in
`tmp/ref` remain the face, skin, and hair references.

Customization must support broad body variety, including fuller bodies, alongside
face and styling controls. Assess adjustable weight, muscle/build, height,
body proportions, facial features, skin, hair, clothing, and optional makeup.
A single fixed fuller-body preset does not fulfill this requirement. Check
clothing fit, rig deformation, and facial control support when assessing sources.

The owner clarified that players should be able to make a likeness of themselves.
Every existing color control except skin must allow the full RGB range. Skin
should cover natural tones and undertones. Opening the dressing room must isolate
the character so the room and other people do not distract from editing.

Next deliverable: one clothed adult character portrait rendered with the game's
actual renderer under neutral lighting, beside the references. Evaluate head
anatomy, skin detail, eyelids and eyes, brows and lashes, and hair together.
Select a visually suitable source and confirm avatar-customization rights before
integrating it. A downloadable model or a functional rig alone is insufficient.
Do not expand to a full cast or describe the look as achieved before inspecting
that portrait. Preserve the existing customization requirements when assessing
whether a replacement can become the production base.

**Architecture:** Keep the MakeHuman CC0 topology, rig, wardrobe, and saved appearance codes. Rebuild gentler base sculpts and bake a CC0 skin texture into the existing face projection. Apply the detail beneath optional makeup so it follows facial morphs without adding draw calls.

**Spec:** `docs/VISION.md` and the owner's realistic character references.

## Work

- [x] Inspect supplied models and references. The supplied VTR3D bases contain CC3+ geometry and 121 facial shapes; Reallusion's character-generation restrictions make them unsuitable for this customizable avatar without separate rights. Local preview only; do not ship them.
- [x] Make eyeshadow optional without changing existing save-code indices; soften the default makeup and hair materials.
- [x] Bake CC0 skin detail with reproducible source acquisition and credit.
- [x] Reduce exaggerated eye enlargement, nose compression, and cheek hollowing; rebuild both bodies and fitted parts.
- [x] Inspect rendered portraits and optional makeup on light and dark skin; verify saved customization and asset integrity.

## Validation

Focused appearance/save/protocol tests; asset credit synchronization; TypeScript, touched-file lint and format checks; browser portraits and the dressing-room makeup persistence test. Keep heavy processes at low priority.

## Source findings

VTR3D female and male bases: 28,092 body triangles each, 101 rig bones, embedded 2048px head albedo and normal maps. Their JSON declares `RL_CC3_Plus`. Sources: <https://www.cgtrader.com/free-3d-models/character/woman/realistic-human-female-body-rigged-gameready> and <https://www.cgtrader.com/free-3d-models/character/man/realistic-human-male-body-rigged-gameready> . Reallusion EULA §§1.16, 2.1(B), 2.1 restrictions (C)(2), 2.2: <https://www.reallusion.com/Content/EULA/EULA.htm> . This is an unresolved rights conflict, not an assertion about the seller's permissions.

## Verification record

95 focused tests passed (appearance, shop, save, face cache, morph pruning, credits).
The dressing-room eyeshadow add/remove/reload browser test passed in 2.3 minutes.
TypeScript, touched-file ESLint and Prettier checks, production build, and
performance budget passed. All original morph names remain in the four rebuilt
body GLBs (59 feminine and 58 masculine), including wardrobe occlusion keys.
Portraits inspected on golden and deep skin, masculine body, and added makeup.
A larger portrait exposed eye-socket UV color boundaries; the bake now fades out
that area so these borders cannot be painted onto visible eyelids.

Remaining visual gap: the current hair cards and skin shading still lack the
fidelity of the owner's paid AAA references. These changes improve the existing
customizable base; they are not a claim of reference-quality parity. Review-agent
execution was unavailable due to its account usage limit; local review performed.

## Continued implementation: likeness controls and isolated dressing room

- Added continuous weight and independent muscle controls, using fitted figure
  morphs across skin and worn parts; existing saves keep their former defaults.
- Expanded skin from five to 22 natural tones, including warm, cool, and neutral
  undertones; retained all original skin IDs.
- Added full RGB pickers and editable hex values for hair, irises, lipstick,
  eyeshadow, blush, highlighter, outfit dye, and swimwear. Colors remain available
  after loading, including former shop colors. Items and styles retain their
  wardrobe rules. Custom colors validate through the shared network boundary.
- Added six independent MakeHuman facial morphs to both bodies and their low
  versions: nose length, bridge, and tip angle; mouth width; chin height and
  depth. The original face-code prefix stays stable. Optional anatomy and RGB
  values fit the existing 32-character network field limit. Feminine bodies now
  retain 65 targets and masculine bodies 64; default influences export at zero.
- Added a separate studio scene in the existing canvas, with neutral lighting,
  front framing by tab, rotation and zoom. World rendering and player movement
  pause while editing; the mounted world preserves the player's location.
  Closing restores the previous camera view. Desktop and phone screenshots
  inspected; appearance changes and the drawer state survive reloading.

Verification: 119 focused logic/cache/credit/protocol/pruning/body-asset tests and 14 city
budget tests passed. Two focused browser tests passed (isolation, custom-color
and anatomy persistence, phone layout, Escape, and focus restoration). TypeScript,
touched-file ESLint, production build, and the initial-download budget passed.

Still outstanding: reference-level face/hair quality, wider source-model
evaluation, and replacing the Kenney crowd placeholders. A local 857-triangle
human crowd prototype fits the existing budget but loses too much facial and
hair detail in the first inspection; it remains under `tmp/`, unshipped.
None of these checks constitutes the owner's visual approval.
