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
} from "./store.ts";
import { FOOD_VENUES } from "../../game/food/venues.ts";
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
