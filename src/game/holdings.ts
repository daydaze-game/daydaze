// Owned property and businesses: the catalog (prices, income, caps), income
// that accrues over real time up to a cap, upgrades, NPC staff and collecting.
// Pure; time is passed in as epoch milliseconds, coins follow src/game/wallet.ts.

import { MAX_COINS, earn, spend } from "./wallet.ts";

const HOUR_MS = 3_600_000;

/** Everything that can be bought. Properties first, then businesses. */
export const HOLDING_IDS = [
  "apartment",
  "house",
  "penthouse",
  "boba-shop",
  "boutique",
  "garage",
  "club",
] as const;

/** A buyable holding. */
export type HoldingId = (typeof HOLDING_IDS)[number];

/** Whether a holding is a home or a business. */
export type HoldingKind = "property" | "business";

/** Static numbers for one holding. */
export interface HoldingDef {
  kind: HoldingKind;
  price: number;
  /** Coins per hour at level 1 with no staff. */
  baseRate: number;
  /** Hours of income the till holds at level 1. */
  baseCapHours: number;
  /** Most staff it can hire. */
  maxStaff: number;
}

export const HOLDINGS: Readonly<Record<HoldingId, HoldingDef>> = {
  apartment: {
    kind: "property",
    price: 500,
    baseRate: 5,
    baseCapHours: 8,
    maxStaff: 0,
  },
  house: {
    kind: "property",
    price: 2_500,
    baseRate: 20,
    baseCapHours: 8,
    maxStaff: 1,
  },
  penthouse: {
    kind: "property",
    price: 12_000,
    baseRate: 80,
    baseCapHours: 12,
    maxStaff: 2,
  },
  "boba-shop": {
    kind: "business",
    price: 1_500,
    baseRate: 30,
    baseCapHours: 8,
    maxStaff: 3,
  },
  boutique: {
    kind: "business",
    price: 4_000,
    baseRate: 60,
    baseCapHours: 8,
    maxStaff: 3,
  },
  garage: {
    kind: "business",
    price: 8_000,
    baseRate: 110,
    baseCapHours: 10,
    maxStaff: 4,
  },
  club: {
    kind: "business",
    price: 25_000,
    baseRate: 300,
    baseCapHours: 12,
    maxStaff: 5,
  },
};

/** Highest upgrade level. */
export const MAX_LEVEL = 5;
/** Income multiplier added per level above 1 (+25% each). */
export const LEVEL_RATE_BONUS = 0.25;
/** Extra hours of storage per level above 1. */
export const LEVEL_CAP_HOURS = 4;
/** Income each staff member adds, as a share of the base rate. */
export const STAFF_RATE_SHARE = 0.2;

/** XP each action is worth, as data for the progression system to read. */
export const HOLDING_XP = {
  buy: 100,
  upgrade: 40,
  hire: 20,
  /** Per 100 coins collected, rounded down. */
  collectPer100: 1,
} as const;

/** Price of upgrading from `level` to `level + 1`, or null at the max. */
export function upgradePrice(id: HoldingId, level: number): number | null {
  if (level >= MAX_LEVEL) return null;
  return Math.round(HOLDINGS[id].price * 0.5 * level);
}

/** Price of hiring the next staff member given the current count. */
export function hirePrice(id: HoldingId, staff: number): number {
  return Math.round(HOLDINGS[id].price * 0.1 * (staff + 1));
}

/** One owned holding. `stored` is fractional so slow income is not lost. */
export interface OwnedHolding {
  level: number;
  staff: number;
  /** Uncollected coins, from 0 to the cap. */
  stored: number;
  /** Epoch ms that `stored` is valid for. */
  updatedAt: number;
}

/** What the player owns. */
export type HoldingsState = Partial<Record<HoldingId, OwnedHolding>>;

/** Coins per hour for a holding at a level with staff. */
export function incomeRate(
  id: HoldingId,
  level: number,
  staff: number,
): number {
  const def = HOLDINGS[id];
  return (
    def.baseRate *
    (1 + LEVEL_RATE_BONUS * (level - 1) + STAFF_RATE_SHARE * staff)
  );
}

/** Most coins a holding's till can hold. */
export function storageCap(id: HoldingId, level: number): number {
  const hours = HOLDINGS[id].baseCapHours + LEVEL_CAP_HOURS * (level - 1);
  return Math.min(
    MAX_COINS,
    incomeRate(id, level, HOLDINGS[id].maxStaff) * hours,
  );
}

/** A holding with income accrued up to `now`. Time going backwards adds none. */
export function accrue(
  id: HoldingId,
  owned: OwnedHolding,
  now: number,
): OwnedHolding {
  if (now <= owned.updatedAt) return owned;
  const hours = (now - owned.updatedAt) / HOUR_MS;
  const gained = incomeRate(id, owned.level, owned.staff) * hours;
  const cap = storageCap(id, owned.level);
  return {
    ...owned,
    stored: Math.min(cap, owned.stored + gained),
    updatedAt: now,
  };
}

/** Whole coins ready to collect from a holding at `now`. */
export function pending(
  id: HoldingId,
  owned: OwnedHolding,
  now: number,
): number {
  return Math.floor(accrue(id, owned, now).stored);
}

/** An action the player takes on their holdings. */
export type HoldingAction =
  | { type: "buy"; id: HoldingId }
  | { type: "upgrade"; id: HoldingId }
  | { type: "hire"; id: HoldingId }
  | { type: "collect"; id: HoldingId | "all" };

/** Why an action did nothing. */
export type HoldingFailure =
  | "not-owned"
  | "already-owned"
  | "too-poor"
  | "max-level"
  | "max-staff"
  | "nothing-to-collect"
  | "wallet-full";

/** The outcome of an action: new state and balance, and XP earned. */
export interface HoldingResult {
  state: HoldingsState;
  coins: number;
  xp: number;
  /** Coins moved into the wallet by a collect. */
  collected: number;
  failure: HoldingFailure | null;
}

function fail(
  state: HoldingsState,
  coins: number,
  failure: HoldingFailure,
): HoldingResult {
  return { state, coins, xp: 0, collected: 0, failure };
}

function collectOne(
  id: HoldingId,
  owned: OwnedHolding,
  coins: number,
  now: number,
): { owned: OwnedHolding; coins: number; taken: number } {
  const fresh = accrue(id, owned, now);
  const taken = Math.min(Math.floor(fresh.stored), MAX_COINS - coins);
  return {
    owned: { ...fresh, stored: fresh.stored - taken },
    coins: earn(coins, taken),
    taken,
  };
}

/** Apply an action at time `now`. Never mutates; failures change nothing. */
export function applyHoldingAction(
  state: HoldingsState,
  coins: number,
  action: HoldingAction,
  now: number,
): HoldingResult {
  if (action.type === "buy") {
    if (state[action.id]) return fail(state, coins, "already-owned");
    const left = spend(coins, HOLDINGS[action.id].price);
    if (left === null) return fail(state, coins, "too-poor");
    return {
      state: {
        ...state,
        [action.id]: { level: 1, staff: 0, stored: 0, updatedAt: now },
      },
      coins: left,
      xp: HOLDING_XP.buy,
      collected: 0,
      failure: null,
    };
  }

  if (action.type === "collect") {
    const ids = action.id === "all" ? HOLDING_IDS : [action.id];
    let next = state;
    let balance = coins;
    let collected = 0;
    for (const id of ids) {
      const owned = next[id];
      if (!owned) {
        if (action.id !== "all") return fail(state, coins, "not-owned");
        continue;
      }
      const r = collectOne(id, owned, balance, now);
      next = { ...next, [id]: r.owned };
      balance = r.coins;
      collected += r.taken;
    }
    if (collected === 0) {
      const full = balance >= MAX_COINS;
      // Keep the accrual so a later collect still sees it, but report no gain.
      return fail(next, coins, full ? "wallet-full" : "nothing-to-collect");
    }
    return {
      state: next,
      coins: balance,
      xp: Math.floor(collected / 100) * HOLDING_XP.collectPer100,
      collected,
      failure: null,
    };
  }

  const owned = state[action.id];
  if (!owned) return fail(state, coins, "not-owned");
  // Bank income at the old rate before anything changes it.
  const fresh = accrue(action.id, owned, now);

  if (action.type === "upgrade") {
    const price = upgradePrice(action.id, fresh.level);
    if (price === null) return fail(state, coins, "max-level");
    const left = spend(coins, price);
    if (left === null) return fail(state, coins, "too-poor");
    return {
      state: { ...state, [action.id]: { ...fresh, level: fresh.level + 1 } },
      coins: left,
      xp: HOLDING_XP.upgrade,
      collected: 0,
      failure: null,
    };
  }

  if (fresh.staff >= HOLDINGS[action.id].maxStaff) {
    return fail(state, coins, "max-staff");
  }
  const left = spend(coins, hirePrice(action.id, fresh.staff));
  if (left === null) return fail(state, coins, "too-poor");
  return {
    state: { ...state, [action.id]: { ...fresh, staff: fresh.staff + 1 } },
    coins: left,
    xp: HOLDING_XP.hire,
    collected: 0,
    failure: null,
  };
}

/** Total coins per hour across everything owned. */
export function totalIncomeRate(state: HoldingsState): number {
  let sum = 0;
  for (const id of HOLDING_IDS) {
    const o = state[id];
    if (o) sum += incomeRate(id, o.level, o.staff);
  }
  return sum;
}

/** Type guard for saved or network holdings; rejects anything out of range. */
export function isHoldingsState(value: unknown): value is HoldingsState {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  for (const [key, raw] of Object.entries(value)) {
    const id = HOLDING_IDS.find((h) => h === key);
    if (!id) return false;
    if (typeof raw !== "object" || raw === null) return false;
    const level: unknown = Reflect.get(raw, "level");
    const staff: unknown = Reflect.get(raw, "staff");
    const stored: unknown = Reflect.get(raw, "stored");
    const updatedAt: unknown = Reflect.get(raw, "updatedAt");
    if (
      typeof level !== "number" ||
      !Number.isInteger(level) ||
      level < 1 ||
      level > MAX_LEVEL
    ) {
      return false;
    }
    if (
      typeof staff !== "number" ||
      !Number.isInteger(staff) ||
      staff < 0 ||
      staff > HOLDINGS[id].maxStaff
    ) {
      return false;
    }
    if (
      typeof stored !== "number" ||
      !Number.isFinite(stored) ||
      stored < 0 ||
      stored > storageCap(id, level)
    ) {
      return false;
    }
    if (typeof updatedAt !== "number" || !Number.isFinite(updatedAt)) {
      return false;
    }
  }
  return true;
}
