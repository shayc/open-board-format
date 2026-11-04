import { playwright } from "@vitest/browser-playwright";
import { coverageConfigDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    restoreMocks: true,
    unstubGlobals: true,
    coverage: {
      include: ["src/**/*.ts"],
      exclude: [...coverageConfigDefaults.exclude, "src/test-utils.ts"],
      thresholds: {
        statements: 95,
        branches: 80,
        functions: 100,
        lines: 95,
      },
    },
    projects: [
      {
        extends: true,
        test: { name: "node", environment: "node" },
      },
      {
        extends: true,
        test: {
          name: "browser",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            screenshotFailures: false,
            instances: [
              { browser: "chromium" },
              { browser: "firefox" },
              { browser: "webkit" },
            ],
          },
        },
      },
    ],
  },
});
