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
);
