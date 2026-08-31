import { defineConfig } from "oxlint";

export default defineConfig({
  options: {
    typeAware: true,
  },
  env: {
    node: true,
  },
  ignorePatterns: ["dist/**", "coverage/**"],
  rules: {
    curly: "error",
  },
});
