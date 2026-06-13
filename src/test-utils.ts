import { readFileSync } from "node:fs";
import { expect } from "vitest";
import { OBFError } from "./errors";
import type { OBFErrorInfo } from "./errors";

const EXAMPLES_DIR = new URL("../tests/examples/", import.meta.url);

/** Read a file from `tests/examples/` as UTF-8 text. */
export function readFixtureText(name: string): string {
  return readFileSync(new URL(name, EXAMPLES_DIR), "utf8");
}

/**
 * Read a file from `tests/examples/` as a standalone `ArrayBuffer`.
 *
 * Copies into a freshly sized buffer rather than handing back a view onto
 * Node's shared read pool, so callers (e.g. `isZip`'s magic-byte check) see
 * the bytes at offset 0.
 */
export function readFixtureArrayBuffer(name: string): ArrayBuffer {
  const bytes = readFileSync(new URL(name, EXAMPLES_DIR));
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
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
 * Assert that `promise` rejects with an {@link OBFError} and return its `info`.
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
