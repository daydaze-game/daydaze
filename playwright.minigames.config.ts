import { defineConfig } from "@playwright/test";

// Override only when another worktree's server already holds 5296.
const port = Number(process.env.MINIGAMES_PORT ?? 5296);

export default defineConfig({
  testDir: "./tests",
  testMatch: "minigames.spec.ts",
  timeout: 60_000,
  fullyParallel: true,
  workers: 2,
  // CI retries a failed test once; a pass on the retry is reported as flaky, not green
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  outputDir: "/tmp/daydaze-minigames-test-results",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { browserName: "chromium", viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    url: `http://localhost:${port}/minigames.html`,
    reuseExistingServer: false,
  },
});
