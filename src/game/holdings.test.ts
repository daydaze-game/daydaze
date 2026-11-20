// Holdings: buying, capped income over real time, upgrades, staff, collecting
// into a capped wallet, and validation of saved state.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  HOLDINGS,
  HOLDING_IDS,
  MAX_LEVEL,
  applyHoldingAction,
  hirePrice,
  incomeRate,
  isHoldingsState,
  pending,
  storageCap,
  totalIncomeRate,
  upgradePrice,
  type HoldingId,
  type HoldingsState,
} from "./holdings.ts";
import { MAX_COINS } from "./wallet.ts";

const HOUR = 3_600_000;

function owned(id: "boba-shop" | "club" = "boba-shop"): HoldingsState {
  const r = applyHoldingAction({}, 100_000, { type: "buy", id }, 0);
  return r.state;
}

/** The holding `id` from `state`, failing the test if it isn't owned. */
function ownedHolding(
  state: HoldingsState,
  id: HoldingId,
): NonNullable<HoldingsState[HoldingId]> {
  const holding = state[id];
  assert.ok(holding, `${id} should be owned`);
  return holding;
}

test("buying costs the price, grants XP, and only once", () => {
  const r = applyHoldingAction({}, 2000, { type: "buy", id: "boba-shop" }, 5);
  assert.equal(r.coins, 2000 - HOLDINGS["boba-shop"].price);
  assert.ok(r.xp > 0);
  assert.deepEqual(r.state["boba-shop"], {
    level: 1,
    staff: 0,
    stored: 0,
    updatedAt: 5,
  });
  const again = applyHoldingAction(
    r.state,
    r.coins,
    { type: "buy", id: "boba-shop" },
    6,
  );
  assert.equal(again.failure, "already-owned");
  assert.equal(again.state, r.state);
});

test("buying needs enough coins", () => {
  const r = applyHoldingAction({}, 10, { type: "buy", id: "club" }, 0);
  assert.equal(r.failure, "too-poor");
  assert.equal(r.coins, 10);
  assert.deepEqual(r.state, {});
});

test("prices climb from home to club", () => {
  assert.ok(HOLDINGS.apartment.price < HOLDINGS.house.price);
  assert.ok(HOLDINGS.house.price < HOLDINGS.penthouse.price);
  for (const id of HOLDING_IDS) assert.ok(HOLDINGS[id].price > 0);
});

test("income accrues with time and stops at the cap", () => {
  const s = owned();
  const o = ownedHolding(s, "boba-shop");
  assert.equal(pending("boba-shop", o, 2 * HOUR), 60);
  const cap = storageCap("boba-shop", 1);
  assert.equal(pending("boba-shop", o, 1000 * HOUR), Math.floor(cap));
});

test("time going backwards adds nothing", () => {
  const o = ownedHolding(
    applyHoldingAction({}, 5000, { type: "buy", id: "boba-shop" }, 10 * HOUR)
      .state,
    "boba-shop",
  );
  assert.equal(pending("boba-shop", o, 0), 0);
});

test("collecting moves whole coins and keeps the fraction", () => {
  const s = owned();
  const r = applyHoldingAction(
    s,
    0,
    { type: "collect", id: "boba-shop" },
    HOUR / 7,
  );
  assert.equal(r.collected, Math.floor(30 / 7));
  assert.equal(r.coins, r.collected);
  const left = ownedHolding(r.state, "boba-shop").stored;
  assert.ok(left >= 0 && left < 1);
  const empty = applyHoldingAction(
    r.state,
    r.coins,
    { type: "collect", id: "boba-shop" },
    HOUR / 7,
  );
  assert.equal(empty.failure, "nothing-to-collect");
});

test("collect fails for something not owned; all skips the unowned", () => {
  assert.equal(
    applyHoldingAction({}, 0, { type: "collect", id: "club" }, 0).failure,
    "not-owned",
  );
  const s = owned();
  const r = applyHoldingAction(s, 0, { type: "collect", id: "all" }, 2 * HOUR);
  assert.equal(r.collected, 60);
});

test("collecting never pushes the wallet past MAX_COINS", () => {
  const s = owned("club");
  const r = applyHoldingAction(
    s,
    MAX_COINS - 10,
    { type: "collect", id: "club" },
    5 * HOUR,
  );
  assert.equal(r.coins, MAX_COINS);
  assert.equal(r.collected, 10);
  assert.ok(
    ownedHolding(r.state, "club").stored > 1000,
    "the rest stays in the till",
  );
  const full = applyHoldingAction(
    r.state,
    MAX_COINS,
    { type: "collect", id: "club" },
    5 * HOUR,
  );
  assert.equal(full.failure, "wallet-full");
});

test("upgrades raise income and the cap, and bank income at the old rate", () => {
  const s = owned();
  const r = applyHoldingAction(
    s,
    5000,
    { type: "upgrade", id: "boba-shop" },
    HOUR,
  );
  assert.equal(r.failure, null);
  const o = ownedHolding(r.state, "boba-shop");
  assert.equal(o.level, 2);
  assert.equal(o.stored, 30);
  assert.ok(incomeRate("boba-shop", 2, 0) > incomeRate("boba-shop", 1, 0));
  assert.ok(storageCap("boba-shop", 2) > storageCap("boba-shop", 1));
  const price = upgradePrice("boba-shop", 1);
  assert.ok(price !== null);
  assert.equal(r.coins, 5000 - price);
});

test("upgrades stop at the max level and need coins", () => {
  assert.equal(upgradePrice("boba-shop", MAX_LEVEL), null);
  const s = owned();
  assert.equal(
    applyHoldingAction(s, 0, { type: "upgrade", id: "boba-shop" }, 0).failure,
    "too-poor",
  );
  let state = s;
  let coins = 1_000_000;
  for (let i = 1; i < MAX_LEVEL; i++) {
    const r = applyHoldingAction(
      state,
      coins,
      { type: "upgrade", id: "boba-shop" },
      0,
    );
    state = r.state;
    coins = r.coins;
  }
  assert.equal(ownedHolding(state, "boba-shop").level, MAX_LEVEL);
  assert.equal(
    applyHoldingAction(state, coins, { type: "upgrade", id: "boba-shop" }, 0)
      .failure,
    "max-level",
  );
});

test("staff add income, cost more each hire, and are limited", () => {
  assert.ok(hirePrice("boba-shop", 1) > hirePrice("boba-shop", 0));
  let state = owned();
  let coins = 100_000;
  for (let i = 0; i < HOLDINGS["boba-shop"].maxStaff; i++) {
    const r = applyHoldingAction(
      state,
      coins,
      { type: "hire", id: "boba-shop" },
      0,
    );
    assert.equal(r.failure, null);
    assert.ok(r.xp > 0);
    state = r.state;
    coins = r.coins;
  }
  assert.ok(incomeRate("boba-shop", 1, 3) > incomeRate("boba-shop", 1, 0));
  assert.equal(
    applyHoldingAction(state, coins, { type: "hire", id: "boba-shop" }, 0)
      .failure,
    "max-staff",
  );
  assert.equal(
    applyHoldingAction({}, coins, { type: "hire", id: "club" }, 0).failure,
    "not-owned",
  );
  const poor = applyHoldingAction(
    owned(),
    0,
    { type: "hire", id: "boba-shop" },
    0,
  );
  assert.equal(poor.failure, "too-poor");
});

test("actions do not mutate the input state", () => {
  const s = owned();
  const snapshot = JSON.stringify(s);
  applyHoldingAction(s, 9999, { type: "upgrade", id: "boba-shop" }, HOUR);
  applyHoldingAction(s, 9999, { type: "collect", id: "all" }, HOUR);
  assert.equal(JSON.stringify(s), snapshot);
});

test("total income sums what is owned", () => {
  assert.equal(totalIncomeRate({}), 0);
  assert.equal(totalIncomeRate(owned()), HOLDINGS["boba-shop"].baseRate);
});

test("isHoldingsState accepts good state and rejects bad", () => {
  assert.equal(isHoldingsState({}), true);
  assert.equal(isHoldingsState(owned()), true);
  const good = { level: 1, staff: 0, stored: 0, updatedAt: 0 };
  for (const bad of [
    null,
    [],
    "x",
    { nope: good },
    { club: { ...good, level: 0 } },
    { club: { ...good, level: MAX_LEVEL + 1 } },
    { club: { ...good, staff: 99 } },
    { club: { ...good, stored: -1 } },
    { club: { ...good, stored: MAX_COINS } },
    { club: { ...good, updatedAt: NaN } },
    { club: null },
  ]) {
    assert.equal(isHoldingsState(bad), false, JSON.stringify(bad));
  }
});
