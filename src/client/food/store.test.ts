// The food store: a held item is replaced, eating empties the tray (and, like
// real food, doesn't sober anyone up), deliveries land after their timer, and
// 13+ drinks leave no buzz.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clearToast,
  eatHeld,
  getFoodState,
  holdItem,
  orderItem,
  resetFood,
  tickDeliveries,
  tickNeeds,
  consumeFood,
  showToast,
} from "./store.ts";
import { take, ageHigh, getMeters } from "../effects/high.ts";
import { FOOD_VENUES, foodVenuesFor } from "../../game/food/venues.ts";
import { DELIVERY_SECONDS } from "../../game/food/delivery.ts";
import { setActiveTier } from "../../game/age.ts";
import { ageBuzz, getBuzz, drink } from "../effects/drunk.ts";

const item = FOOD_VENUES[0].menu[0];

test("a held item is replaced, and eating empties the tray but doesn't sober her up", () => {
  resetFood();
  setActiveTier("adult"); // buzz exists only at 18+
  drink("cocktail");
  setActiveTier("teen");
  ageBuzz(60);
  const before = getBuzz();
  assert.ok(before > 0);
  holdItem(item);
  assert.equal(getFoodState().held, item);
  eatHeld();
  assert.equal(getFoodState().held, null);
  assert.equal(getBuzz(), before, "only time sobers her up");
  ageBuzz(100_000); // tests share one process
});

test("a delivery lands after the timer, puts the item in hand and toasts", () => {
  resetFood();
  orderItem(item.id, 0);
  orderItem("nope", 0);
  assert.equal(getFoodState().orders.length, 1);
  tickDeliveries(DELIVERY_SECONDS * 1000 - 1);
  assert.equal(getFoodState().held, null);
  tickDeliveries(DELIVERY_SECONDS * 1000);
  assert.equal(getFoodState().held, item);
  assert.equal(getFoodState().orders.length, 0);
  assert.match(getFoodState().toast ?? "", new RegExp(item.name));
  clearToast();
  assert.equal(getFoodState().toast, null);
  resetFood();
});

test("a 13+ drink toasts a mocktail and leaves no buzz", () => {
  resetFood();
  const before = getBuzz();
  drink("cocktail");
  assert.match(getFoodState().toast ?? "", /^You sip /);
  assert.equal(getBuzz(), before);
});

test("an 18+ sake flight raises the buzz instead of easing it", () => {
  resetFood();
  setActiveTier("adult");
  const flight = foodVenuesFor("adult")
    .flatMap((v) => v.menu)
    .find((m) => m.name === "Sake flight");
  assert.ok(flight);
  const before = getBuzz();
  holdItem(flight);
  eatHeld();
  ageBuzz(60);
  assert.ok(getBuzz() > before);
  setActiveTier("teen");
  ageBuzz(100_000); // tests share one process
});

test("food and water satisfy weed needs, including a delivered meal, without sobering up", () => {
  resetFood();
  setActiveTier("adult");
  take("joint");
  ageHigh(110); // the joint is at its peak
  const high = getMeters().high.level;
  assert.ok(high > 0.15);
  tickNeeds(60);
  const before = getFoodState().needs;
  assert.ok(before.hunger > 0);
  assert.ok(before.thirst > 0);
  showToast("Cotton mouth: a snack or water might help.");
  assert.deepEqual(getFoodState().needs, before);
  orderItem(item.id, 0);
  tickDeliveries(DELIVERY_SECONDS * 1000);
  eatHeld();
  assert.equal(getFoodState().held, null);
  assert.ok(getFoodState().needs.hunger < before.hunger);
  assert.equal(getFoodState().needs.thirst, before.thirst);
  assert.match(getFoodState().toast ?? "", /hit the spot/);
  consumeFood("drink"); // shared by quick water and vending drinks
  assert.equal(getFoodState().needs.thirst, 0);
  assert.match(getFoodState().toast ?? "", /refreshing/);
  assert.equal(getMeters().high.level, high);
  ageHigh(100_000);
  setActiveTier("teen");
  resetFood();
});

test("alcohol does not satisfy dry mouth, and the teen gate clears needs", () => {
  resetFood();
  setActiveTier("adult");
  take("joint");
  ageHigh(110);
  tickNeeds(60);
  const before = getFoodState().needs;
  const flight = foodVenuesFor("adult")
    .flatMap((v) => v.menu)
    .find((m) => m.alcohol);
  assert.ok(flight);
  holdItem(flight);
  eatHeld();
  assert.deepEqual(getFoodState().needs, before);
  assert.equal(getFoodState().toast, null);
  setActiveTier("teen");
  tickNeeds(60);
  assert.deepEqual(getFoodState().needs, { hunger: 0, thirst: 0 });
  consumeFood("drink");
  assert.equal(getFoodState().toast, null);
  ageHigh(100_000);
  ageBuzz(100_000);
  resetFood();
});
