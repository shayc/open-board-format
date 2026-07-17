import { describe, expect, test } from "vitest";
import type { OBFErrorInfo } from "./errors";
import { OBFError } from "./errors";
import { validateOBF } from "./obf";
import { parseManifest } from "./obz";
import { expectOBFError } from "./test-utils";

/**
 * Stands in for consumer code: switching on `info.code` narrows to each
 * variant's fields with no casts, and the `default` arm still has a usable
 * `info.code`. Exhaustiveness is enforced in `formatOBFError`, not here — the
 * `default` arm below absorbs any variant added later.
 */
function summarize(info: OBFErrorInfo): string {
  switch (info.code) {
    case "missing-resource":
      return `${info.kind}:${info.mediaId}:${info.path}`;
    case "invalid-board":
    case "invalid-manifest":
      return `${info.code}:${info.issues.length}`;
    default:
      return info.code;
  }
}

describe("OBFError", () => {
  test("is an Error subclass with name 'OBFError' and a structured info", () => {
    const error = new OBFError({ code: "not-zip" });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(OBFError);
    expect(error.name).toBe("OBFError");
    expect(error.info.code).toBe("not-zip");
    expect(typeof error.message).toBe("string");
    expect(error.message.length).toBeGreaterThan(0);
  });

  test("threads `cause` from constructor options", () => {
    const root = new SyntaxError("boom");
    const error = new OBFError(
      { code: "not-json", source: "board" },
      { cause: root },
    );

    expect(error.cause).toBe(root);
  });

  test("omits `cause` when no options are passed", () => {
    expect(new OBFError({ code: "not-zip" }).cause).toBeUndefined();
  });

  test("derives a non-empty message for the zip-failed variant", () => {
    const error = new OBFError(
      { code: "zip-failed" },
      { cause: new Error("boom") },
    );

    expect(error.info.code).toBe("zip-failed");
    expect(error.message).toContain("ZIP archive");
    expect(error.cause).toBeInstanceOf(Error);
  });

  /**
   * Each `archive-too-large` limit gets its own message branch. Messages are
   * explicitly not part of the stable contract, so assert that the branch names
   * the numbers and path a reader needs — not its exact wording. The `info`
   * payloads are pinned exactly in zip.test.ts.
   */
  test.each([
    [
      "maxEntries",
      {
        code: "archive-too-large",
        limit: "maxEntries",
        maxEntries: 2,
        entryCount: 3,
        path: "sounds/extra.mp3",
      },
      ["3", "2", "sounds/extra.mp3"],
    ],
    [
      "maxEntrySize",
      {
        code: "archive-too-large",
        limit: "maxEntrySize",
        maxBytes: 50,
        declaredBytes: 100,
        path: "images/big.png",
      },
      ["100", "50", "images/big.png"],
    ],
    [
      "maxTotalOriginalSize",
      {
        code: "archive-too-large",
        limit: "maxTotalOriginalSize",
        maxBytes: 100,
        declaredBytes: 120,
        path: "sounds/last.mp3",
      },
      ["120", "100", "sounds/last.mp3"],
    ],
  ] as const)(
    "derives a message for the archive-too-large %s limit",
    (_limit, info, expected) => {
      const { message } = new OBFError(info);

      for (const fragment of expected) {
        expect(message).toContain(fragment);
      }
    },
  );

  test("derives a message for the internal variant from its detail", () => {
    const error = new OBFError(
      { code: "internal", detail: "generated manifest failed validation" },
      { cause: new Error("boom") },
    );

    expect(error.info.code).toBe("internal");
    expect(error.message).toContain("generated manifest failed validation");
    expect(error.cause).toBeInstanceOf(Error);
  });

  test("info discriminates: narrowing on `code` exposes that variant's fields", () => {
    expect(
      summarize({
        code: "missing-resource",
        kind: "image",
        mediaId: "i1",
        path: "images/i1.png",
      }),
    ).toBe("image:i1:images/i1.png");

    expect(summarize({ code: "not-zip" })).toBe("not-zip");
  });
});

describe("thrown OBFError.info carries its variant-specific fields", () => {
  test("validateOBF → invalid-board carries non-empty issues", () => {
    const info = expectOBFError(() => validateOBF({ id: "x" }));

    expect(info.code).toBe("invalid-board");
    if (info.code === "invalid-board") {
      expect(info.issues.length).toBeGreaterThan(0);
      expect(info.issues[0]).toHaveProperty("message");
    }
  });

  test("parseManifest → invalid-manifest carries issues", () => {
    const info = expectOBFError(() =>
      parseManifest(JSON.stringify({ format: "nope" })),
    );

    expect(info.code).toBe("invalid-manifest");
    if (info.code === "invalid-manifest") {
      expect(info.issues.length).toBeGreaterThan(0);
    }
  });

  test("parseManifest → not-json carries source: manifest", () => {
    const info = expectOBFError(() => parseManifest("{ not json "));

    expect(info).toMatchObject({ code: "not-json", source: "manifest" });
  });
});
