// @ts-check
// Lint rules for the whole repo: ESLint's and typescript-eslint's recommended
// sets, plus React's hooks rules for the client. Formatting is Prettier's job,
// so nothing here is about style.
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

/** Rules that need TypeScript's type information (see where it's used). */
const typeAware = {
  files: ["**/*.{ts,tsx}"],
  languageOptions: {
    parserOptions: {
      projectService: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },
  rules: {
    "@typescript-eslint/no-misused-promises": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-unnecessary-type-assertion": "error",
    "@typescript-eslint/no-unnecessary-type-conversion": "error",
    "@typescript-eslint/no-unsafe-assignment": "error",
    "@typescript-eslint/no-unsafe-argument": "error",
    "@typescript-eslint/no-unsafe-call": "error",
    "@typescript-eslint/no-unsafe-member-access": "error",
    "@typescript-eslint/no-unsafe-return": "error",
  },
};

export default defineConfig(
  {
    ignores: [
      "docs/agents/**",
      "dist/",
      "coverage/",
      "test-results/",
      "playwright-report/",
      ".worktrees/",
      // agent and harness scratch (git-excluded)
      ".claude/",
      ".agents/",
      ".codex/",
      ".superpowers/",
      ".impeccable/",
      "skills/",
      "tmp/",
      "art/",
      // early exploration builds, kept for reference
      "prototypes/",
      "public/",
      "server/worker-configuration.d.ts",
      "server/.wrangler/",
    ],
  },
  {
    files: ["**/*.{js,mjs,ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // unused bindings are errors, except deliberate `_` placeholders
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // Type-aware rules: the project service finds each file's tsconfig
  // (server/src/worker is typed through server/tsconfig.json). Loading the
  // TypeScript program makes a run about 10x slower, so ESLINT_NO_TYPES=1
  // (set by the pre-commit hook) skips them; CI always runs them.
  // server/worker-configuration.d.ts is generated (`npm run types:server`, run
  // by `npm run lint`); without it every Workers type is unresolved and the
  // no-unsafe-* rules flag each use.
  ...(process.env.ESLINT_NO_TYPES === "1" ? [] : [typeAware]),
  {
    // node:test's test() and describe() return promises by design.
    files: ["**/*.test.ts"],
    rules: { "@typescript-eslint/no-floating-promises": "off" },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
  {
    // Accessibility of the DOM UI (src/client/ui and friends).
    files: ["src/**/*.tsx"],
    extends: [jsxA11y.flatConfigs.recommended],
    rules: {
      // R3F and NPC components take a `role` prop that is a game role, not an
      // ARIA role, so this rule misreads them.
      "jsx-a11y/aria-role": "off",
    },
  },
  {
    // Render rule: allocate nothing inside useFrame (GC hitches at 60 fps).
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.name='useFrame'] :function NewExpression",
          message:
            "No `new` inside useFrame: hoist it to a module constant or useMemo/useRef.",
        },
      ],
    },
  },
);
