/**
 * Guards against fflate's asynchronous API, which moves large entries into
 * Workers created from `blob:` URLs. A Content Security Policy that does not
 * allow `blob:` workers blocks them silently, and the promise never settles.
 *
 * fflate loads `worker_threads` through `createRequire`, which Vitest cannot
 * intercept, so these tests replace the Worker-backed entry points instead and
 * push entries above the sizes at which fflate would use a Worker (160 KB to
 * deflate, 512 KB to inflate) through every public path.
 */

import { describe, expect, test, vi } from "vitest";
import { loadBoard } from "./load-board";
import { createOBZ, extractOBZ } from "./obz";
import { makeBoard } from "./test-utils";
import { unzip, zip } from "./zip";

vi.mock("fflate", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fflate")>();
  const workerBacked = (name: string) => () => {
    throw new Error(`fflate.${name} would start a Worker`);
  };
  return {
    ...actual,
    unzip: workerBacked("unzip"),
    zip: workerBacked("zip"),
    inflate: workerBacked("inflate"),
    deflate: workerBacked("deflate"),
  };
});

/** About 1 MB of text that deflates well, like a large board JSON. */
const largeText = "happy sad drink eat more stop go ".repeat(32_000);

describe("ZIP work never uses fflate's Worker-backed API", () => {
  test("zip and unzip handle large compressible entries", async () => {
    const content = new TextEncoder().encode(largeText);

    const zipped = await zip(new Map([["big.txt", content]]));
    const unzipped = await unzip(
      zipped.buffer.slice(
        zipped.byteOffset,
        zipped.byteOffset + zipped.byteLength,
      ) as ArrayBuffer,
    );

    expect(unzipped.get("big.txt")).toEqual(content);
  });

  test("createOBZ, extractOBZ, and loadBoard handle a large board", async () => {
    const board = makeBoard({ id: "big", description_html: largeText });

    const obz = await createOBZ([board], "big");
    const extracted = await extractOBZ(obz);
    const loaded = await loadBoard(obz);

    expect(extracted.rootBoard.description_html).toBe(largeText);
    expect(loaded.format).toBe("obz");
  });
});
