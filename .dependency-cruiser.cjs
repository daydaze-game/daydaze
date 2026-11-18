/**
 * dependency-cruiser config: enforces the layer rules from ARCHITECTURE.md
 * ("The layers") mechanically. Run with `npm run lint:deps`.
 *
 * - src/game is pure (no React, three.js, client, audio, net client or server).
 * - src/net and src/audio never touch React, three.js or src/client.
 * - server/src never touches src/client or src/audio.
 * - No cycles; no runtime imports of devDependencies from production source.
 */
const UI_LIBS = "(^|/)node_modules/(react|react-dom|three|@react-three/[^/]+)/";

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "game-is-pure-libs",
      comment: "src/game is pure logic: no React or three.js.",
      severity: "error",
      from: { path: "^src/game/" },
      to: { path: UI_LIBS },
    },
    {
      name: "game-is-pure-layers",
      comment:
        "src/game must not reach into the client, audio, net client or server.",
      severity: "error",
      from: { path: "^src/game/" },
      to: { path: "^(src/client|src/net/client|src/audio|server)/" },
    },
    {
      name: "net-no-ui",
      comment:
        "src/net (protocol, room server, browser client) imports no React, three.js or src/client.",
      severity: "error",
      from: { path: "^src/net/" },
      to: { path: [UI_LIBS, "^src/client/"] },
    },
    {
      name: "audio-no-ui",
      comment: "src/audio is Web Audio only: no React, three.js or src/client.",
      severity: "error",
      from: { path: "^src/audio/" },
      to: { path: [UI_LIBS, "^src/client/"] },
    },
    {
      name: "server-no-client",
      comment:
        "server/src may share src/game and src/net, never src/client or src/audio.",
      severity: "error",
      from: { path: "^server/src/" },
      to: { path: "^src/(client|audio)/" },
    },
    {
      name: "no-circular",
      comment: "Cycles make load order fragile.",
      severity: "warn",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-dev-deps-in-prod",
      comment: "Production source may only import devDependencies as types.",
      severity: "error",
      from: { path: "^(src|server/src)/", pathNot: "\\.test\\.tsx?$" },
      to: { dependencyTypes: ["npm-dev"], dependencyTypesNot: ["type-only"] },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    exclude: { path: "\\.test\\.tsx?$" },
  },
};
