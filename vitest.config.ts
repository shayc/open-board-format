import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    restoreMocks: true,
    unstubGlobals: true,
    coverage: {
      include: ["src/**/*.ts"],
      thresholds: {
        statements: 95,
        branches: 80,
        functions: 100,
        lines: 95,
      },
    },
  },
});
