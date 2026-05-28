import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  target: "es2025",
  sourcemap: true,
  publint: { enabled: "ci-only", strict: true, level: "error" },
});
