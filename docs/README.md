# Daydaze docs

Everything under `docs/`, by what you'd come looking for. The project
overview and quickstart are in the root [README](../README.md); how the code
fits together is in [ARCHITECTURE.md](../ARCHITECTURE.md); the dev workflow
is in [CONTRIBUTING.md](../CONTRIBUTING.md); what changed is in
[CHANGELOG.md](../CHANGELOG.md).

## Product

- [VISION.md](VISION.md): audience, tone, age tiers, platform and the open
  decisions. Read it before any product or design decision.

## Developing and debugging

- [dev-tools.md](dev-tools.md): the in-game dev panel (press `` ` `` in
  `npm run dev`), the `__dd` console handles, every URL flag and helpful
  browser extensions.
- [security.md](security.md): the threat model and known gaps.
- [deploy.md](deploy.md): deploying the Worker and client to Cloudflare
  (owner-approved only).

## Assets

- [assets.md](assets.md): every third-party asset with its license and
  credit (kept in step with `src/game/credits.ts` by a test).
- [asset-inventory.md](asset-inventory.md): what's been found, what's in
  use, and the "Use next" list.

## Plans

What to build, newest first. The current plan is the top one.

- [plans/2026-11-14-next.md](plans/2026-11-14-next.md): next steps.
- [plans/2026-11-14-meshy.md](plans/2026-11-14-meshy.md): game-specific
  Meshy models.
- [plans/2026-11-11-handoff.md](plans/2026-11-11-handoff.md): the
  previous handoff (done).
- [plans/2026-11-07-smooth-and-alive.md](plans/2026-11-07-smooth-and-alive.md):
  performance, a faster walk, Mixamo clips and real cars.
- [plans/2026-11-06-clay-day.md](plans/2026-11-06-clay-day.md): the
  pottery studio.
- [plans/2026-11-05-street-food.md](plans/2026-11-05-street-food.md): city
  street food.
- [plans/2026-10-26-deploy-gate.md](plans/2026-10-26-deploy-gate.md): what
  blocks the first deploy.
- [plans/2026-10-26-real-world-pass.md](plans/2026-10-26-real-world-pass.md):
  the real-world look pass.
- [plans/2026-10-24-wonder-pass.md](plans/2026-10-24-wonder-pass.md): the
  wonder pass.
- [plans/2026-10-23-next-steps.md](plans/2026-10-23-next-steps.md): the
  running log of what's done and the gotchas list.
- [plans/2026-10-14-speedway-and-driving.md](plans/2026-10-14-speedway-and-driving.md):
  the speedway and driving.
- [plans/2026-10-14-master-roadmap.md](plans/2026-10-14-master-roadmap.md):
  milestones M0 to M11.

## Specs

Design specs the plans build on.

- [specs/2026-10-14-3d-client-foundation-design.md](specs/2026-10-14-3d-client-foundation-design.md):
  the 3D client foundation.
- [specs/2026-10-14-online-foundation-design.md](specs/2026-10-14-online-foundation-design.md):
  accounts, guests, shared rooms, chat and moderation.
- [specs/2026-10-14-open-city-design.md](specs/2026-10-14-open-city-design.md):
  the open city.
- [specs/2026-10-14-world-content-design.md](specs/2026-10-14-world-content-design.md):
  districts, places, games and effects.
- [specs/2026-10-24-wonder-pass.md](specs/2026-10-24-wonder-pass.md): the
  wonder pass.

## How it's built

- [agents/](agents/README.md): how the game is built with parallel AI
  coding agents: the workflow, the build agents' brief
  ([agent-rules.md](agents/agent-rules.md)), tool inventory
  ([TOOLS.md](agents/TOOLS.md)), the workflow log and merge scripts.
- [screenshots/](screenshots/): screenshots of the game, used by the
  README and plans.
