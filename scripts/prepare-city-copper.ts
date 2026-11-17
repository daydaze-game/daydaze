// Converts the owner's collected CC0 copper into three shared roof textures.
// Usage: node --experimental-strip-types scripts/prepare-city-copper.ts [source-dir]
// Defaults to the main checkout's ignored local-assets, including in worktrees.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve(import.meta.dirname, "..");
const common = execFileSync("git", ["rev-parse", "--git-common-dir"], {
  cwd: root,
  encoding: "utf8",
}).trim();
const main = dirname(resolve(root, common));
const source =
  process.argv[2] ??
  join(
    main,
    "local-assets/downloads/game/curated-world/gardens/materials/Metal058B",
  );
const out = join(root, "public/textures/city_copper");
mkdirSync(out, { recursive: true });
const hashes: Record<string, string> = {};
function input(kind: string) {
  const name = `Metal058B_1K-JPG_${kind}.jpg`;
  const bytes = readFileSync(join(source, name));
  hashes[name] = createHash("sha256").update(bytes).digest("hex");
  return `data:image/jpeg;base64,${bytes.toString("base64")}`;
}
const sources = {
  diff: input("Color"),
  nor: input("NormalGL"),
  rough: input("Roughness"),
  metal: input("Metalness"),
};
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const maps = await page.evaluate(async (sources) => {
    async function pixels(src: string) {
      const image = new Image();
      image.src = src;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 512;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No texture conversion canvas");
      ctx.drawImage(image, 0, 0, 512, 512);
      return { canvas, ctx };
    }
    const color = await pixels(sources.diff);
    const normal = await pixels(sources.nor);
    const rough = await pixels(sources.rough);
    const metal = await pixels(sources.metal);
    const packed = rough.ctx.getImageData(0, 0, 512, 512);
    const metalPixels = metal.ctx.getImageData(0, 0, 512, 512);
    // Green roughness, blue metalness, matching glTF's data channel layout.
    for (let i = 0; i < packed.data.length; i += 4) {
      packed.data[i] = 255;
      packed.data[i + 2] = metalPixels.data[i] ?? 0;
    }
    rough.ctx.putImageData(packed, 0, 0);
    return {
      diff: color.canvas.toDataURL("image/webp", 0.88),
      nor: normal.canvas.toDataURL("image/webp", 0.92),
      surface: rough.canvas.toDataURL("image/webp", 0.92),
    };
  }, sources);
  for (const [name, data] of Object.entries(maps))
    writeFileSync(
      join(out, `${name}.webp`),
      Buffer.from(data.split(",")[1] ?? "", "base64"),
    );
  writeFileSync(
    join(out, "source.json"),
    JSON.stringify(
      {
        source: "https://ambientcg.com/view?id=Metal058B",
        author: "ambientCG",
        license: "CC0 1.0",
        size: 512,
        channels: "surface: G roughness, B metalness",
        sha256: hashes,
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
}
