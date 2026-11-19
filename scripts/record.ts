// Records a screen recording (MP4) of any scene or minigame from the dev
// server, for the Record workflow (.github/workflows/record.yml) or by hand:
//
//   npm run dev -- --port 5195 --strictPort
//   SCENE="room=karaoke" SECONDS=20 node --experimental-strip-types scripts/record.ts
//   GAME=<minigame id> node --experimental-strip-types scripts/record.ts
//
// Inputs come from the environment so the workflow passes them without
// putting them in a shell command:
//   SCENE      URL flags after "?" (docs/dev-tools.md): room=plaza, time=23:00,
//              night=<id>, adult=1, ... Default room=plaza.
//   GAME       a minigame id (MINIGAME_IDS), opened from the dev panel.
//   CLICKS     buttons to press once the scene is up, in order, comma-separated
//              by their visible name: "Play" starts a minigame's round.
//   SECONDS    length of the recording, 1-120. Default 20.
//   TIMESCALE  0.05-1; below 1 slows the player and every doll so the slow
//              software renderer catches the motion (plays back in slow motion).
//   QUALITY    low (default) or high.
//   MOBILE     1 for a phone-sized touch viewport.
//   BASE_URL   the dev server, default http://localhost:5195.
// The recording starts once the scene has rendered, not at page load. Output:
// recordings/<name>.mp4 (needs ffmpeg).

import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { MINIGAME_IDS } from "../src/game/hotspots.ts";

/** What to record, after validation. */
export interface RecordOptions {
  scene: string;
  game: string;
  clicks: string[];
  seconds: number;
  timescale: number;
  quality: "low" | "high";
  mobile: boolean;
}

/** Reads and validates the inputs; throws a message naming the bad one. */
export function parseOptions(
  env: Readonly<Record<string, string | undefined>>,
): RecordOptions {
  const scene = (env.SCENE ?? "").trim() || "room=plaza";
  // URL flags only: no spaces, quotes or anything that could change the URL's shape
  if (!/^[A-Za-z0-9=&,.:_-]+$/.test(scene))
    throw new Error(`SCENE "${scene}" has characters a URL flag never needs`);
  const game = (env.GAME ?? "").trim();
  if (game && !MINIGAME_IDS.some((id) => id === game))
    throw new Error(`GAME "${game}" is not one of: ${MINIGAME_IDS.join(", ")}`);
  const clicksText = (env.CLICKS ?? "").trim();
  if (!/^[A-Za-z0-9 ,'!?.-]*$/.test(clicksText))
    throw new Error(`CLICKS "${clicksText}" is not a list of button names`);
  const clicks = clicksText
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  const seconds = Number(env.SECONDS?.trim() || "20");
  if (!(seconds >= 1 && seconds <= 120))
    throw new Error(`SECONDS must be 1-120, got "${env.SECONDS}"`);
  const timescale = Number(env.TIMESCALE?.trim() || "1");
  if (!(timescale >= 0.05 && timescale <= 1))
    throw new Error(`TIMESCALE must be 0.05-1, got "${env.TIMESCALE}"`);
  const quality = env.QUALITY?.trim() || "low";
  if (quality !== "low" && quality !== "high")
    throw new Error(`QUALITY must be low or high, got "${quality}"`);
  return {
    scene,
    game,
    clicks,
    seconds,
    timescale,
    quality,
    mobile: env.MOBILE === "1" || env.MOBILE === "true",
  };
}

/** The page URL: the scene's flags plus quality, timescale and onboarding off. */
export function recordUrl(base: string, o: RecordOptions): string {
  const flags = [`quality=${o.quality}`, o.scene];
  if (o.timescale !== 1) flags.push(`timescale=${o.timescale}`);
  return `${base}/?${flags.join("&")}`;
}

/** A file-name-safe name for the recording. */
export function recordingName(o: RecordOptions): string {
  const base = o.game ? `game-${o.game}` : o.scene;
  return base
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/**
 * ffmpeg concat-demuxer list that shows frame i from its paint time until the
 * next one (the last until `endedAt`), so a still scene holds its frame.
 */
export function concatList(times: readonly number[], endedAt: number): string {
  const lines: string[] = [];
  times.forEach((t, i) => {
    const next = times[i + 1] ?? endedAt;
    lines.push(
      `file '${String(i).padStart(5, "0")}.jpg'`,
      `duration ${Math.max(next - t, 0.001).toFixed(3)}`,
    );
  });
  // the demuxer ignores the last duration unless that file is listed again
  const last = times.length - 1;
  if (last >= 0) lines.push(`file '${String(last).padStart(5, "0")}.jpg'`);
  return lines.join("\n") + "\n";
}

if (import.meta.main) {
  const o = parseOptions(process.env);
  const base = process.env.BASE_URL ?? "http://localhost:5195";
  const viewport = o.mobile
    ? { width: 390, height: 844 }
    : { width: 1280, height: 800 };
  const name = recordingName(o);
  const frameDir = "recordings/frames";
  rmSync(frameDir, { recursive: true, force: true });
  mkdirSync(frameDir, { recursive: true });

  const browser = await chromium.launch({
    args: [
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const context = await browser.newContext({
    viewport,
    isMobile: o.mobile,
    hasTouch: o.mobile,
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.error("page error:", e.message));
  // a fresh save would show the first-visit walkthrough over the scene
  await page.addInitScript(() => {
    const key = "daydaze-save-v1";
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "{}");
    const save = typeof parsed === "object" && parsed !== null ? parsed : {};
    if (!("onboarded" in save))
      localStorage.setItem(key, JSON.stringify({ ...save, onboarded: true }));
  });
  await page.goto(recordUrl(base, o), { timeout: 300_000 });
  await page.waitForFunction(
    () => Number(document.querySelector("canvas")?.dataset.frames) >= 6,
    null,
    { timeout: 600_000 },
  );
  if (o.game) {
    // the dev panel (dev server only) opens any minigame directly
    await page.keyboard.press("Backquote");
    await page.locator('select[aria-label="game"]').selectOption(o.game);
    await page.keyboard.press("Backquote");
  }

  for (const name of o.clicks)
    await page
      .getByRole("button", { name, exact: true })
      .click({ timeout: 60_000 });

  // A CDP screencast delivers every frame the browser paints, with its time.
  // Playwright's own video squeezes the timeline when the software renderer
  // stalls, so we keep the frames and let ffmpeg hold each for its real length.
  const times: number[] = [];
  const addFrame = (jpeg: Buffer, at: number) => {
    writeFileSync(
      `${frameDir}/${String(times.length).padStart(5, "0")}.jpg`,
      jpeg,
    );
    times.push(at);
  };
  const cdp = await context.newCDPSession(page);
  cdp.on("Page.screencastFrame", (f) => {
    addFrame(
      Buffer.from(f.data, "base64"),
      f.metadata.timestamp ?? Date.now() / 1000,
    );
    void cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId });
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 85 });
  const startedAt = Date.now() / 1000;
  await new Promise((done) => setTimeout(done, o.seconds * 1000));
  const endedAt = Date.now() / 1000;
  await cdp.send("Page.stopScreencast");
  // The first paint can come late, and a scene that never repaints sends none:
  // hold the first frame from the start, or fall back to one screenshot.
  if (times.length === 0) {
    // a busy software renderer can take minutes over one capture
    const shot = await page.screenshot({
      type: "jpeg",
      quality: 85,
      timeout: 180_000,
    });
    addFrame(shot, startedAt);
  } else {
    times[0] = Math.min(times[0] ?? startedAt, startedAt);
  }
  await browser.close();

  const out = `recordings/${name}.mp4`;
  writeFileSync(`${frameDir}/list.txt`, concatList(times, endedAt));
  execFileSync(
    "ffmpeg",
    [
      ...["-v", "error", "-y", "-f", "concat", "-safe", "0"],
      ...[
        "-i",
        `${frameDir}/list.txt`,
        "-vf",
        "fps=25,scale=trunc(iw/2)*2:trunc(ih/2)*2",
      ],
      // the demuxer holds the last frame for one frame too long: cut at the real end
      ...["-t", (endedAt - (times[0] ?? startedAt)).toFixed(3)],
      ...[
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        out,
      ],
    ],
    { stdio: "inherit" },
  );
  rmSync(frameDir, { recursive: true, force: true });
  console.log(`recorded ${out}: ${times.length} frames over ${o.seconds} s`);
}
