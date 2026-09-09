import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  //
  // This list REPLACES the defaults, so anything omitted here gets walked.
  // Without the entries below, `pnpm lint` took over four minutes and
  // reported ~26k problems: it was linting dependencies and a full second
  // copy of this project living in a git worktree under .claude/ —
  // 15,694 files against the 175 that are actually ours.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Dependencies — must be explicit, this list replaces the defaults.
    "node_modules/**",
    // Claude Code scratch space. Holds git worktrees that each contain a
    // complete copy of the repo, including their own node_modules.
    ".claude/**",
    // Generated output.
    "graphify-out/**",
    "playwright-report/**",
    "test-results/**",
    "coverage/**",
  ]),
]);

export default eslintConfig;
