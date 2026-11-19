# Weed munchies and thirst implementation plan

**Goal:** Close #274 by connecting weed's hunger and dry mouth to the existing
food, water, street vendors, and courier loop.

**Architecture:** Pure bounded needs rules in `src/game/food/needs.ts`;
ephemeral state in the existing food store. The food HUD's existing timer
samples the live high meter and advances needs. Existing consume paths share
one relief entry point. No save, network, asset, or NPC changes.

**Choices:** Needs range from 0 to 1. At full weed intensity hunger fills in
120 seconds and thirst in 90; both fade over 60 sober seconds. A meal relieves
0.65 hunger, a soft drink 0.8 thirst. At 0.25, small meters invite a food run;
consumption while high gives a short relief toast. Alcohol provides no relief.
Only the 18+ tier enables needs. No penalties or lost progress.

- [x] Add failing pure tests for high/sober/teen behavior, invalid deltas,
      bounds, matching relief, and unchanged intoxication.
- [x] Implement pure needs and food-store integration; test held, delivered,
      quick snack/water, and vending consumption, with 13+ isolation.
- [x] Show accessible needs and relief feedback in FoodHud; keep the delivery
      timer and toast working. Clamp background time so tab suspension adds no debt.
- [ ] Run focused tests, lint/type checks, and Playwright for the food loop and
      age gate; inspect desktop/mobile screenshots, then open a focused PR for CI.
