/**
 * ---
 * file: eslint.config.mjs
 * project: earthandhoney
 * purpose: ESLint flat config — Next.js core-web-vitals and TypeScript rules, with generated/vendor paths ignored
 * created-by: dev-team
 * related-story: US-1
 * related-ac: 1.5
 * ---
 */
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendor design-template assets (CLAUDE.md) — not our code, never linted.
    "public/photobuddy/**",
    // Vendored PicPeak fork (US-15, pinned commit) — not our code, never linted.
    "vendor/picpeak/**",
    // Generated test coverage report.
    "coverage/**",
  ]),
]);

export default eslintConfig;
