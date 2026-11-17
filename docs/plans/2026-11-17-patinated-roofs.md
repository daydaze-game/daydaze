# Patinated city roofs

Refs #12. The owner delegated art direction and requested continued small,
verified scenery batches. This batch enriches existing roof and metal surfaces
with ambientCG Metal058B (CC0), retaining family colors and the surface flags.

A separate material per roof would split draws; replacing every roof's palette
with identical green copper would reduce variety. Instead, share color, normal
and roughness textures across the existing flagged architecture material. Keep
stone, glazing, foliage and luminous surfaces independent. Project in model
space so detail remains aligned through instancing and LOD changes. No added
lights, geometry or transparency.

- [ ] Convert the collected source to reproducible 512px WebP maps; record hashes,
      origin and both credit ledgers.
- [ ] Blend copper weathering only on metal flags; use measured roughness and
      metalness with reduced response on oxidized areas. Dispose added textures.
- [ ] Run focused checks, full GitHub verification and targeted city browser tests.
- [ ] Capture and inspect arrival, avenue and night views; document results.
- [ ] Review, rebase, merge a green PR and remove the worktree.
