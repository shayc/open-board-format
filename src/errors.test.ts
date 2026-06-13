import { describe, expect, test } from "vitest";
import { OBFError } from "./errors";
import type { OBFErrorInfo } from "./errors";
import { createOBZ, extractOBZ, parseManifest } from "./obz";
import { parseOBF, validateOBF } from "./obf";
import type { OBFBoard } from "./schema";

const board = (overrides: Partial<OBFBoard> = {}): OBFBoard => ({
  format: "open-board-0.1",
  id: "b",
  buttons: [],
  grid: { rows: 1, columns: 1, order: [[null]] },
  ...overrides,
});

/**
 * Switching on `info.code` narrows to each variant's fields with no casts.
 * The `default` arm is reachable as a real union, and adding a new variant to
 * `OBFErrorInfo` without handling it here would be a compile error.
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

  test("threads `cause` for variants that carry one", () => {
    const root = new SyntaxError("boom");
    const error = new OBFError({
      code: "not-json",
      source: "board",
      cause: root,
    });

    expect(error.cause).toBe(root);
  });

  test("omits `cause` for variants that have none", () => {
    expect(new OBFError({ code: "not-zip" }).cause).toBeUndefined();
  });

  test("derives a non-empty message for the zip-failed variant", () => {
    const error = new OBFError({
      code: "zip-failed",
      cause: new Error("boom"),
    });

    expect(error.info.code).toBe("zip-failed");
    expect(error.message).toContain("ZIP archive");
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

describe("thrown OBFError.info across the surface", () => {
  test("parseOBF → not-json on malformed JSON", () => {
    let info: OBFErrorInfo | undefined;
    try {
      parseOBF("{ not json ");
    } catch (error) {
      info = (error as OBFError).info;
    }

    expect(info).toMatchObject({ code: "not-json", source: "board" });
  });

  test("validateOBF → invalid-board carries non-empty issues", () => {
    let error: OBFError | undefined;
    try {
      validateOBF({ id: "x" });
    } catch (caught) {
      error = caught as OBFError;
    }

    expect(error?.info.code).toBe("invalid-board");
    if (error?.info.code === "invalid-board") {
      expect(error.info.issues.length).toBeGreaterThan(0);
      expect(error.info.issues[0]).toHaveProperty("message");
    }
  });

  test("parseManifest → invalid-manifest carries issues", () => {
    let error: OBFError | undefined;
    try {
      parseManifest(JSON.stringify({ format: "nope" }));
    } catch (caught) {
      error = caught as OBFError;
    }

    expect(error?.info.code).toBe("invalid-manifest");
    if (error?.info.code === "invalid-manifest") {
      expect(error.info.issues.length).toBeGreaterThan(0);
    }
  });

  test("extractOBZ → not-zip for non-archive bytes", async () => {
    await expect(extractOBZ(new ArrayBuffer(4))).rejects.toMatchObject({
      info: { code: "not-zip" },
    });
  });

  test("createOBZ → unknown-root names the offending id", async () => {
    await expect(createOBZ([board()], "missing")).rejects.toMatchObject({
      info: { code: "unknown-root", rootBoardId: "missing" },
    });
  });

  test("createOBZ → duplicate-board names the repeated id", async () => {
    await expect(createOBZ([board(), board()], "b")).rejects.toMatchObject({
      info: { code: "duplicate-board", boardId: "b" },
    });
  });

  test("createOBZ → missing-resource names kind, id, and path", async () => {
    const withImage = board({
      images: [{ id: "i1", path: "images/i1.png" }],
    });

    await expect(createOBZ([withImage], "b")).rejects.toMatchObject({
      info: {
        code: "missing-resource",
        kind: "image",
        mediaId: "i1",
        path: "images/i1.png",
      },
    });
  });

  test("createOBZ → path-collision names the colliding path", async () => {
    const resources = new Map([["manifest.json", new Uint8Array([1])]]);

    await expect(createOBZ([board()], "b", resources)).rejects.toMatchObject({
      info: { code: "path-collision", path: "manifest.json" },
    });
  });
});
