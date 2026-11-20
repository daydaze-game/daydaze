// Runs the crowd painter (paint.html) in headless Chromium against a
// throwaway Vite server and writes its faces, irises and recipe.json into
// art/crowd/.cache/ for build_crowd.py. Usage: node art/crowd/paint-run.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { createServer } from "vite";

const root = fileURLToPath(new URL("../..", import.meta.url));
const out = fileURLToPath(new URL("./.cache/", import.meta.url));

const server = await createServer({
  root,
  server: { port: 0, strictPort: false, host: "127.0.0.1" },
  logLevel: "warn",
});
await server.listen();
const browser = await chromium.launch();
try {
  const url = server.resolvedUrls?.local[0];
  if (!url) throw new Error("vite did not start");
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.error(e.message));
  await page.goto(`${url}art/crowd/paint.html`);
  await page.waitForFunction(() => document.body.dataset.ready === "true");
  const result: unknown = await page.evaluate(() => {
    const run: unknown = Reflect.get(window, "paint");
    if (typeof run !== "function") throw new Error("no paint() on the page");
    return run();
  });
  if (
    typeof result !== "object" ||
    result === null ||
    !("recipe" in result) ||
    !("images" in result) ||
    typeof result.images !== "object" ||
    result.images === null
  )
    throw new Error("the painter returned no recipe");
  mkdirSync(out, { recursive: true });
  for (const [name, data] of Object.entries(result.images))
    if (typeof data === "string")
      writeFileSync(out + name, Buffer.from(data, "base64"));
  writeFileSync(out + "recipe.json", JSON.stringify(result.recipe, null, 1));
  console.log("painted", Object.keys(result.images).length, "images into", out);
} finally {
  await browser.close();
  await server.close();
}
