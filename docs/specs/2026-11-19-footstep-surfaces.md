# Footstep Surfaces and Synthesis: Material Realism Underfoot

Status: implemented 2026-11-19, addressing issue #225.

## Context and intent

Footsteps previously had only two procedural sounds: `hard` (a lowpass noise
burst) and `soft` (a bandpass noise burst), with optional sample overrides for
pavement, wood, and sand. In rooms and across the city, walking sounded
monotonous, synthetic, and unrealistic.

This spec adds distinct procedural Web Audio synthesis for:

- `wood`: hollow wooden plank thud with warm low-mid resonance.
- `tile`: crisp, hard ceramic tap with high-mid attack and instant decay.
- `metal`: metallic impact click with resonant pinging harmonics.
- `gravel`: multi-grain crunchy scatter of loose stones underfoot.
- `puddle` / `wet`: wet squelch and water splash.
- `hard` / `pavement`: firm pavement tap.
- `soft` / `sand` / `grass`: muffled soft scuff.

## Surface mapping

1. **City Ground Detection (`groundAt`):**
   - Boardwalk -> `wood`
   - Beach shore / waterline (`z >= WATER_Z - 3`) -> `puddle`
   - Beach sand -> `sand` (maps to `soft`)
   - Farmers market lane & dog park -> `gravel`
   - Park lawns -> `grass` (maps to `soft`)
   - Park paths, sidewalks, streets -> `pavement` (maps to `hard`)

2. **Room Floors:**
   - Underfoot room surfaces are mapped via `roomSurface(roomId)` in `src/game/surface.ts` (`wood`, `tile`, `metal`, `gravel`, `soft`, `hard`, `puddle`), defaulting to `hard` pavement/flooring when unspecified.
   - Beach areas such as `open-water` map to `soft` (dry sand), while submerged water venues (e.g. `mermaid-cove`) map to `puddle`.

3. **Water Wading:**
   - When the player is in shallow water (`state === "wade"`), footsteps automatically trigger `puddle` splash sounds regardless of room or ground type.

## Technical implementation

- Pure Web Audio nodes: noise buffer slices, bandpass/lowpass/highpass biquad
  filters, twin resonant peaking filters, and short enveloped tone generators.
- No memory allocation in `useFrame`: audio nodes are transiently routed via
  the shared SFX bus (`sfx()`).
- Backward compatible: `playStep(surface?: Surface)` accepts all existing and
  new surface identifiers.
