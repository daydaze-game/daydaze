// The pouch: item ids, cleaning saved data, caps, adding and using, the two
// shops' menus and the friend's daily gift. Pure.
import assert from "node:assert/strict";
import { test } from "node:test";
import { DOSES, STRAINS } from "./effects/substances.ts";
import {
  addItem,
  buyItem,
  claimGift,
  cleanGiftDay,
  cleanInventory,
  giftFor,
  isItemId,
  ITEMS,
  itemOf,
  MAX_PER_ITEM,
  MAX_TOTAL,
  MENUS,
  totalOf,
  removeItem,
  usable,
  type Inventory,
} from "./inventory.ts";

test("every item is a weed method of a strain, named for it", () => {
  assert.equal(ITEMS.length, 3 * STRAINS.length);
  for (const item of ITEMS) {
    assert.equal(DOSES[item.dose].substance, "high");
    assert.equal(item.id, `${item.dose}-${item.strain}`);
    assert.equal(itemOf(item.id), item);
  }
  assert.equal(itemOf("joint-sativa")?.name, "Sativa joint");
  assert.equal(itemOf("vape-hemp")?.name, "Hemp vape");
  assert.equal(itemOf("tab-hybrid"), null);
  assert.equal(isItemId("toString"), false);
});

test("cleaning salvages valid counts and is idempotent", () => {
  assert.deepEqual(cleanInventory(null), {});
  assert.deepEqual(cleanInventory("pouch"), {});
  assert.deepEqual(cleanInventory([1, 2]), {});
  const dirty = {
    "joint-sativa": 3,
    "vape-indica": 2.7,
    "edible-hemp": -4,
    "edible-hybrid": "5",
    "joint-hybrid": 99,
    "tab-hybrid": 2,
    "joint-hemp": 0,
  };
  const clean = cleanInventory(dirty);
  assert.deepEqual(clean, {
    "joint-sativa": 3,
    "joint-hybrid": MAX_PER_ITEM,
  });
  assert.deepEqual(cleanInventory(clean), clean);
});

test("cleaning enforces the total cap, and stays idempotent", () => {
  const full: Inventory = {};
  for (const item of ITEMS) full[item.id] = MAX_PER_ITEM;
  const clean = cleanInventory(full);
  assert.equal(totalOf(clean), MAX_TOTAL);
  assert.deepEqual(cleanInventory(clean), clean);
});

test("adding stops at the per-item and total caps, leaving the pouch alone", () => {
  let inv: Inventory = {};
  const one = addItem(inv, "joint-sativa");
  assert.deepEqual(one, { "joint-sativa": 1 });
  assert.deepEqual(inv, {});
  inv = { "joint-sativa": MAX_PER_ITEM };
  assert.equal(addItem(inv, "joint-sativa"), null);
  assert.deepEqual(addItem(inv, "vape-hemp"), {
    "joint-sativa": MAX_PER_ITEM,
    "vape-hemp": 1,
  });
  inv = { "joint-sativa": 10, "joint-indica": 10, "joint-hybrid": 9 };
  assert.equal(totalOf(inv), 29);
  assert.ok(addItem(inv, "vape-hemp"));
  assert.equal(addItem(inv, "vape-hemp", 2), null);
  assert.equal(addItem(inv, "vape-hemp", 0), null);
});

test("using takes one, and drops the entry at zero", () => {
  const inv: Inventory = { "joint-sativa": 2, "vape-hemp": 1 };
  assert.deepEqual(removeItem(inv, "joint-sativa"), {
    "joint-sativa": 1,
    "vape-hemp": 1,
  });
  assert.deepEqual(removeItem(inv, "vape-hemp"), { "joint-sativa": 2 });
  assert.equal(removeItem(inv, "edible-indica"), null);
  assert.deepEqual(inv, { "joint-sativa": 2, "vape-hemp": 1 });
});

test("the pouch is usable only at 18+, and only when it holds something", () => {
  const inv: Inventory = { "joint-sativa": 1 };
  assert.equal(usable("adult", inv), true);
  assert.equal(usable("teen", inv), false);
  assert.equal(usable("adult", {}), false);
});

test("the counter sells weaker hemp for less; the dispensary the strains", () => {
  const gas = MENUS.gas.map((m) => itemOf(m.id)?.strain);
  assert.ok(gas.length > 0 && gas.every((s) => s === "hemp"));
  const shop = MENUS.dispensary.map((m) => itemOf(m.id)?.strain);
  assert.deepEqual(new Set(shop), new Set(["hybrid", "sativa", "indica"]));
  for (const method of ["joint", "vape", "edible"] as const) {
    const g = MENUS.gas.find((m) => itemOf(m.id)?.dose === method);
    const d = MENUS.dispensary.find((m) => itemOf(m.id)?.dose === method);
    assert.ok(g && d && g.price < d.price, method);
  }
});

test("buying pays and fills the pouch, or changes nothing", () => {
  const id = MENUS.gas[0]?.id;
  const price = MENUS.gas[0]?.price;
  assert.ok(id && price);
  assert.deepEqual(buyItem("gas", price + 4, {}, id), {
    coins: 4,
    inventory: { [id]: 1 },
  });
  assert.equal(buyItem("gas", price - 1, {}, id), null);
  assert.equal(buyItem("gas", 999, { [id]: MAX_PER_ITEM }, id), null);
  // not on this shop's menu
  assert.equal(buyItem("gas", 999, {}, "joint-sativa"), null);
  assert.equal(buyItem("dispensary", 999, {}, id), null);
});

test("the friend gives one dispensary item a day, if there is room", () => {
  const today = 20_000;
  const gift = giftFor(today);
  assert.ok(MENUS.dispensary.some((m) => m.id === gift));
  assert.equal(giftFor(today), gift);
  const got = claimGift({}, 0, today);
  assert.deepEqual(got, {
    inventory: { [gift]: 1 },
    giftDay: today,
    item: gift,
  });
  // already today, or a clock that ran backwards
  assert.equal(claimGift({}, today, today), null);
  assert.equal(claimGift({}, today + 1, today), null);
  assert.ok(claimGift({}, today - 1, today));
  // a full pouch keeps the gift for later (the day isn't used up)
  assert.equal(claimGift({ [gift]: MAX_PER_ITEM }, 0, today), null);
  // every day's gift is a real item
  for (let d = 0; d < 40; d++) assert.ok(isItemId(giftFor(d)));
});

test("the gift day is a non-negative whole day, else 0", () => {
  assert.equal(cleanGiftDay(20_000), 20_000);
  for (const bad of [-1, 1.5, NaN, Infinity, "20", null, undefined])
    assert.equal(cleanGiftDay(bad), 0);
});
