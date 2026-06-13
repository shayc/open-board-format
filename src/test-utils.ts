import { expect } from "vitest";
import { OBFError } from "./errors";
import type { OBFErrorInfo } from "./errors";

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
