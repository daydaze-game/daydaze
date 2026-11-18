// Renders closet eye/lip previews from the runtime's native facial morphs.
// Start Vite first; BASE_URL=http://localhost:5221 node --experimental-strip-types
// scripts/face-previews.ts. Uses the same CC0 MakeHuman assets as the player.
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import {
  DEFAULT_FACE,
  EYE_SHAPES,
  LIP_SHAPES,
  encodeFace,
} from "../src/game/look.ts";

const base = process.env.BASE_URL ?? "http://localhost:5195";
const output = new URL("../public/closet/", import.meta.url);
const browser = await chromium.launch({
  headless: true,
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
try {
  await mkdir(output, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 512, height: 320 } });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const group of [
    { field: "eyeShape", prefix: "eye", shot: "eyetile", options: EYE_SHAPES },
    {
      field: "lipShape",
      prefix: "lips",
      shot: "lipstile",
      options: LIP_SHAPES,
    },
  ] as const) {
    const params = new URLSearchParams({
      human: "1",
      studio: "1",
      still: "1",
      shot: group.shot,
    });
    await page.goto(`${base}/src/client/avatar/lineup.html?${params}`);
    await page.waitForFunction(
      () => typeof Reflect.get(window, "setPreviewFace") === "function",
    );
    for (const option of group.options) {
      const face = encodeFace({ ...DEFAULT_FACE, [group.field]: option.id });
      await page.evaluate((code) => {
        const select: unknown = Reflect.get(window, "setPreviewFace");
        if (typeof select !== "function")
          throw new Error("Missing live preset selection");
        select(code);
      }, face);
      await page.waitForFunction(
        (code) =>
          document.body.dataset.ready === "true" &&
          document.body.dataset.previewFace === code &&
          Number(document.body.dataset.frames) >= 12,
        face,
        {
          timeout: 180_000,
        },
      );
      if (errors.length) throw new Error(errors.join("\n"));
      const file = new URL(`${group.prefix}-${option.id}.webp`, output);
      const webp = await page.evaluate(() => {
        const source = document.querySelector("canvas");
        if (!source) throw new Error("Missing native preview canvas");
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 160;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Cannot create preview image canvas");
        // The lab preserves its drawing buffer so native pixels can be exported.
        context.drawImage(source, 0, 0, 256, 160);
        return canvas.toDataURL("image/webp", 0.88).split(",")[1];
      });
      await writeFile(file, Buffer.from(webp, "base64"));
      console.log(file.pathname);
    }
  }
} finally {
  await browser.close();
}
