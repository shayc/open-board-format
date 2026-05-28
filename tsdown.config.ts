import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  exports: true,
  publint: { enabled: "ci-only", strict: true, level: "error" },
});
