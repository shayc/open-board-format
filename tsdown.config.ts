import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  exports: true,
  sourcemap: true,
  target: "es2025",
  publint: { enabled: "ci-only", strict: true, level: "error" },
});
