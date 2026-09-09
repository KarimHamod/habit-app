import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    // "node", not "jsdom": nothing under tests/ renders a component or
    // touches document/window, and importing jsdom from this repo's
    // filesystem takes ~88s — past Vitest's hard 60s worker-start timeout,
    // which silently killed every worker before a single test could run.
    // A test that genuinely needs a DOM can opt in with a
    // `// @vitest-environment jsdom` docblock at the top of the file.
    environment: "node",
    include: [
      "tests/unit/**/*.test.{ts,tsx}",
      "tests/integration/**/*.test.{ts,tsx}",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
