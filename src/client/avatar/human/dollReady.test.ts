// Test doll readiness logic for hair, outfit and footwear.
import assert from "node:assert/strict";
import { test } from "node:test";
import { isDollReady } from "./dollReady.ts";

test("isDollReady requires outfit, hair, and footwear when all are present", () => {
  const parts = {
    garments: [{ key: "outfit" }],
    hair: "/models/doll/hair-bob.glb",
    shoes: "/models/doll/shoes-platforms.glb",
  };

  assert.equal(
    isDollReady(new Set(["outfit", "hair"]), parts),
    false,
    "missing shoes should keep doll unready",
  );

  assert.equal(
    isDollReady(new Set(["outfit", "shoes"]), parts),
    false,
    "missing hair should keep doll unready",
  );

  assert.equal(
    isDollReady(new Set(["hair", "shoes"]), parts),
    false,
    "missing outfit should keep doll unready",
  );

  assert.equal(
    isDollReady(new Set(["outfit", "hair", "shoes"]), parts),
    true,
    "all worn parts present resolves ready",
  );
});

test("isDollReady handles bald hairstyles without hair asset requirement", () => {
  const parts = {
    garments: [{ key: "outfit" }],
    hair: null,
    shoes: "/models/doll/shoes-sneakers.glb",
  };

  assert.equal(
    isDollReady(new Set(["outfit"]), parts),
    false,
    "bald look still requires footwear",
  );

  assert.equal(
    isDollReady(new Set(["outfit", "shoes"]), parts),
    true,
    "bald look is ready once outfit and shoes load",
  );
});

test("isDollReady handles swimwear without footwear requirement", () => {
  const parts = {
    garments: [{ key: "outfit" }],
    hair: "/models/doll/hair-long.glb",
    shoes: null,
  };

  assert.equal(
    isDollReady(new Set(["outfit"]), parts),
    false,
    "swimwear still requires hair if not bald",
  );

  assert.equal(
    isDollReady(new Set(["outfit", "hair"]), parts),
    true,
    "swimwear is ready once outfit and hair load",
  );
});

test("isDollReady waits for every garment of a mixed look", () => {
  const parts = {
    garments: [{ key: "top" }, { key: "bottom" }, { key: "outer" }],
    hair: null,
    shoes: null,
  };
  assert.equal(isDollReady(new Set(["top", "bottom"]), parts), false);
  assert.equal(isDollReady(new Set(["top", "bottom", "outer"]), parts), true);
});
