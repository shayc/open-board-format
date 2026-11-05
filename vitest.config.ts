import { coverageConfigDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    restoreMocks: true,
    unstubGlobals: true,
    coverage: {
      include: ["src/**/*.ts"],
      exclude: [
        ...coverageConfigDefaults.exclude,
        "src/test-utils.ts",
        "src/**/*.test-d.ts",
      ],
      thresholds: {
        statements: 95,
        branches: 80,
        functions: 100,
        lines: 95,
      },
    },
  },
});
