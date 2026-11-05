/**
 * Checks that field docs from `src/schema.ts` reach the published types.
 *
 * TypeScript drops JSDoc from object literals when it emits declarations, so
 * every object schema must be built with `obfObject<Shape>()` from a named
 * shape type (see `src/schema.ts`). This script fails when the built
 * declarations contain an inline object shape, a shape field without a doc
 * comment, or an object schema whose shape type is missing.
 *
 * Run after `npm run build`.
 */

import { readFileSync } from "node:fs";

const file = new URL("../dist/index.d.mts", import.meta.url);
const lines = readFileSync(file, "utf8").split("\n");
const errors = [];

// An inline `ZodObject<{ … }>` means a schema was built without a named shape
// type, so its field docs were dropped.
lines.forEach((line, i) => {
  if (line.includes("ZodObject<{")) {
    errors.push(`line ${i + 1}: inline object shape loses field docs`);
  }
});

// Every field of every shape type must carry a doc comment. A shape printed
// on one line (e.g. a mapped type merging other shapes) must not declare
// fields of its own, since a one-line field has no doc comment.
const shapes = new Set();
for (let i = 0; i < lines.length; i++) {
  const start = /^type (\w+Shape) = (.*)$/.exec(lines[i]);
  if (!start) {
    continue;
  }
  shapes.add(start[1]);
  if (!start[2].endsWith("{")) {
    const field = /[{;] (\w+)\??: /.exec(start[2]);
    if (field) {
      errors.push(`line ${i + 1}: ${start[1]}.${field[1]} has no doc comment`);
    }
    continue;
  }
  let previous = lines[i];
  for (i++; i < lines.length && !lines[i].startsWith("}"); i++) {
    const field = /^ {2}(\w+)\??: /.exec(lines[i]);
    if (field && !previous.trimEnd().endsWith("*/")) {
      errors.push(`line ${i + 1}: ${start[1]}.${field[1]} has no doc comment`);
    }
    previous = lines[i];
  }
}

// Every object schema must reference a shape type that is in the file.
let schemas = 0;
for (const [i, line] of lines.entries()) {
  const schema = /^export declare const (\w+): z\.ZodObject<(\w+)/.exec(line);
  if (!schema) {
    continue;
  }
  schemas++;
  if (!shapes.has(schema[2])) {
    errors.push(`line ${i + 1}: ${schema[1]} uses unknown shape ${schema[2]}`);
  }
}

if (schemas === 0) {
  errors.push("no object schemas found; has the declaration format changed?");
}

if (errors.length > 0) {
  console.error(
    `check:dts failed for dist/index.d.mts:\n  ${errors.join("\n  ")}`,
  );
  process.exit(1);
}

console.log(
  `check:dts: ${schemas} object schemas and ${shapes.size} shape types keep their field docs.`,
);
