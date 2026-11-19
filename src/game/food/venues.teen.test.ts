// Menus at the default 13+ tier: no alcohol in any venue name, cuisine or dish.
import { test } from "node:test";
import assert from "node:assert/strict";
import { FOOD_VENUES, foodVenuesFor } from "./venues.ts";

const ALCOHOL =
  /\b(sake|margarita|sangria|lager|martini|old fashioned|wine|kir royale|beer hall|bierhaus|pub|makgeolli|izakaya|(?:yuzu|whiskey|pisco) sour|cider|soju|mimosa|stout|tavern|saloon|taproom|cantina|brewery|bourbon|whiskey|vodka|tequila|rum|gin|cocktail)\b|(?<!ginger )\bale\b/i;

test("13+ menus and venue names carry no alcohol", () => {
  const names = FOOD_VENUES.flatMap((v) => [
    v.name,
    v.cuisine,
    ...v.menu.map((m) => m.name),
  ]);
  assert.deepEqual(
    names.filter((n) => ALCOHOL.test(n)),
    [],
  );
});

test("the same builder gives 18+ its alcohol and 13+ none", () => {
  const dishes = (tier: "teen" | "adult") =>
    foodVenuesFor(tier).flatMap((v) => [v.name, ...v.menu.map((m) => m.name)]);
  assert.ok(dishes("adult").includes("Frozen margarita"));
  assert.ok(dishes("adult").includes("Makgeolli"));
  assert.deepEqual(
    dishes("teen").filter((n) => ALCOHOL.test(n)),
    [],
  );
});

test("18+ alcohol is marked with its buzz drink and 13+ menus have none", () => {
  const items = (tier: "teen" | "adult") =>
    foodVenuesFor(tier).flatMap((v) => v.menu);
  const named = (name: string) =>
    items("adult").find((m) => m.name === name)?.alcohol;
  assert.equal(named("Sake flight"), "cocktail");
  assert.equal(named("Lager stein"), "beer");
  assert.equal(named("Sake pour"), "shot");
  assert.equal(named("Hot spiced cider"), undefined, "no alcohol in it");
  assert.deepEqual(
    items("teen").filter((m) => m.alcohol),
    [],
  );
  // Every adult item the alcohol regex catches carries the marker, except
  // hot spiced cider (an American mulled apple juice).
  assert.deepEqual(
    items("adult").filter(
      (m) =>
        m.kind === "drink" &&
        ALCOHOL.test(m.name) &&
        !m.alcohol &&
        m.name !== "Hot spiced cider",
    ),
    [],
  );
});
