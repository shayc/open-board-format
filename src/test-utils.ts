import { expect } from "vitest";
import type { OBFErrorInfo } from "./errors";
import { OBFError } from "./errors";
import type { OBFBoard } from "./schema";

const EXAMPLES_DIR = new URL("../tests/examples/", import.meta.url);

/** Build a minimal valid {@link OBFBoard}, with `overrides` merged on top. */
export const makeBoard = (overrides: Partial<OBFBoard> = {}): OBFBoard => ({
  format: "open-board-0.1",
  id: "b",
  buttons: [],
  grid: { rows: 1, columns: 1, order: [[null]] },
  ...overrides,
});

/**
 * Read a file from `tests/examples/` as bytes, in Node or in a Vitest browser
 * run (where `node:fs` is unavailable and the test server reads it instead).
 *
 * Returns a freshly sized copy rather than a view onto Node's shared read
 * pool, so callers (e.g. `isZip`'s magic-byte check) see the bytes at offset 0.
 */
async function readFixtureBytes(name: string): Promise<Uint8Array> {
  if ("document" in globalThis) {
    const { commands } = await import("vitest/browser");
    const base64 = await commands.readFile(`tests/examples/${name}`, {
      encoding: "base64",
    });
    return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  }

  const { readFile } = await import("node:fs/promises");
  return new Uint8Array(await readFile(new URL(name, EXAMPLES_DIR)));
}

/** Read a file from `tests/examples/` as UTF-8 text. */
export async function readFixtureText(name: string): Promise<string> {
  return new TextDecoder().decode(await readFixtureBytes(name));
}

/** Read a file from `tests/examples/` as a standalone `ArrayBuffer`. */
export async function readFixtureArrayBuffer(
  name: string,
): Promise<ArrayBuffer> {
  return (await readFixtureBytes(name)).buffer as ArrayBuffer;
}

/**
 * Assert that `fn` throws an {@link OBFError} and return its `info`, so callers
 * can make further assertions on the discriminated failure.
 */
export function expectOBFError(fn: () => unknown): OBFErrorInfo {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(OBFError);
    return (error as OBFError).info;
  }
  throw new Error("expected fn to throw an OBFError, but it returned normally");
}

/**
 * Assert that `promise` rejects with an {@link OBFError} and return its `info`,
 * so callers can make further assertions on the discriminated failure.
 */
export async function expectOBFErrorAsync(
  promise: Promise<unknown>,
): Promise<OBFErrorInfo> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(OBFError);
    return (error as OBFError).info;
  }
  throw new Error(
    "expected promise to reject with an OBFError, but it resolved",
  );
}
