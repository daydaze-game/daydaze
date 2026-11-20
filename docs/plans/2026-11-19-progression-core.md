# Progression core implementation plan

> Execute inline with the executing-plans skill, using test-first pure logic.

**Goal:** Implement #255, the first dependency in #273: a local climb across
levels 1–100 and ten ranks each of Street, Fame, and Hustle.

**Architecture:** Pure progression rules and activity rewards live in
`src/game/progression/`. The existing save gains an independently versioned
progression field; older saves receive fresh progress without losing anything.
The app applies XP and rank coin bonuses together. Small React controls add a
HUD badge/bar, a menu ladder panel, selected title, and rank celebration.

**Spec:** Issue #255 and the level/ladders section of PR #250's
`docs/specs/2026-11-19-progression-design.md`.

## Constraints

- Existing activities remain open; no real-money purchases or random rewards.
- Remain single-player; no deployment or online protocol changes.
- Keep current save key and outer version; version the new nested schema.
- No new assets, NPC dialogue, dependencies, or per-frame rendering work.

## Implementation choices

- Grade XP: C 25, B 45, A 70, S 100; personal best adds 25.
- A daily challenge adds 75 to its game's ladder. Discovery adds 30 Street XP.
- An actual scheduled event occurrence pays 75 Fame XP once, across its venues.
- Level L starts at `100 * (L - 1) + 25 * (L - 1) * (L - 2)` total XP.
- Rank thresholds: 0, 250, 800, 1800, 3500, 6000, 10000, 16000, 25000, 40000.
- Each newly crossed rank pays `100 * rankIndex` coins, once in the same
  transaction; initial ranks pay nothing. XP never decreases.
- Complete Hustle's draft with Tycoon, Magnate, Empire, and Dynasty.
- Only existing activity completions award XP. Ambient heists and police
  chases are scenery today; later interactive systems will use the same award
  function. Contracts, streaks, and achievements remain separate issues.

## Review focus

Old/corrupt saves, exact threshold boundaries, multiple ranks in one award,
duplicate discovery/event payouts across reloads, and selecting locked titles.

## Tasks

- [x] Test and implement progression schema validation, level/rank boundaries,
      immutable awards, coin bonuses, caps, and title eligibility.
- [x] Test and implement exhaustive scored-game ladder mapping, grade rewards,
      daily bonuses, discovery/event deduplication, and save migration.
- [x] Connect existing prize, legacy minigame, discovery, and shoplift payouts;
      keep updater functions pure and celebration effects outside them.
- [x] Build accessible HUD/menu progress and title selection; celebrate only
      ranks earned during play, respecting reduced motion and sound settings.
- [ ] Verify focused logic tests, types/lint, browser behavior and responsive
      screenshots; open a focused PR referencing #255 and #273 for CI.
