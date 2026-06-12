import { describe, expect, test } from "vitest";
import { createOBZ, extractOBZ, loadOBZ, parseManifest } from "./obz";
import type { OBFBoard } from "./schema";
import { zip } from "./zip";

describe("parseManifest", () => {
  test("parses valid manifest", () => {
    const validManifest = JSON.stringify({
      format: "open-board-0.1",
      root: "boards/test.obf",
      paths: { boards: { test: "boards/test.obf" }, images: {} },
    });

    const manifest = parseManifest(validManifest);

    expect(manifest.format).toBe("open-board-0.1");
    expect(manifest.root).toBe("boards/test.obf");
    expect(manifest.paths.boards.test).toBe("boards/test.obf");
  });

  test("throws for invalid manifest format", () => {
    const invalidManifest = JSON.stringify({
      format: "wrong-format",
      root: "boards/test.obf",
      paths: { boards: { test: "boards/test.obf" }, images: {} },
    });

    expect(() => parseManifest(invalidManifest)).toThrow(/Invalid manifest/);
  });

  test("throws when root is not listed in paths.boards", () => {
    const rootNotListed = JSON.stringify({
      format: "open-board-0.1",
      root: "boards/ghost.obf",
      paths: { boards: { test: "boards/test.obf" }, images: {} },
    });

    expect(() => parseManifest(rootNotListed)).toThrow(/Invalid manifest/);
  });
});

describe("extractOBZ", () => {
  test("extracts valid OBZ archive", async () => {
    const board: OBFBoard = {
      format: "open-board-0.1",
      id: "test",
      buttons: [{ id: "btn-1", label: "Hello" }],
      grid: { rows: 1, columns: 1, order: [["btn-1"]] },
    };

    const obzBlob = await createOBZ([board], "test");
    const result = await extractOBZ(await obzBlob.arrayBuffer());

    expect(result.manifest.root).toBe("boards/test.obf");
    expect(result.resources.has("manifest.json")).toBe(true);
    expect(result.resources.has("boards/test.obf")).toBe(true);

    const extractedBoard = result.boards.get("test");
    expect(extractedBoard).toMatchObject({
      id: "test",
      buttons: [{ id: "btn-1", label: "Hello" }],
      grid: { rows: 1, columns: 1, order: [["btn-1"]] },
    });
  });

  test("throws for non-ZIP input", async () => {
    const notZip = new ArrayBuffer(10);

    await expect(extractOBZ(notZip)).rejects.toThrow(
      "Invalid OBZ: not a ZIP file",
    );
  });

  test("throws for missing manifest.json", async () => {
    const filesWithoutManifest = new Map([
      ["boards/test.obf", new TextEncoder().encode("{}")],
    ]);
    const zipBuffer = await zip(filesWithoutManifest);

    await expect(extractOBZ(zipBuffer.buffer as ArrayBuffer)).rejects.toThrow(
      "Invalid OBZ: missing manifest.json",
    );
  });

  test("throws when manifest references a missing board file", async () => {
    const manifest = JSON.stringify({
      format: "open-board-0.1",
      root: "boards/missing.obf",
      paths: { boards: { missing: "boards/missing.obf" }, images: {} },
    });
    const filesWithMissingBoard = new Map([
      ["manifest.json", new TextEncoder().encode(manifest)],
    ]);
    const zipBuffer = await zip(filesWithMissingBoard);

    await expect(extractOBZ(zipBuffer.buffer as ArrayBuffer)).rejects.toThrow(
      'Invalid OBZ: board "missing" declared in manifest but missing',
    );
  });
});

describe("loadOBZ", () => {
  test("loads OBZ package from File object", async () => {
    const board: OBFBoard = {
      format: "open-board-0.1",
      id: "test",
      buttons: [],
      grid: { rows: 1, columns: 1, order: [[null]] },
    };

    const obzBlob = await createOBZ([board], "test");
    const file = new File([obzBlob], "test.obz", { type: "application/zip" });

    const result = await loadOBZ(file);

    expect(result.manifest.root).toBe("boards/test.obf");
    expect(result.boards.get("test")).toBeDefined();
  });
});

describe("createOBZ", () => {
  test("includes resources in archive", async () => {
    const board: OBFBoard = {
      format: "open-board-0.1",
      id: "board-1",
      buttons: [],
      grid: { rows: 1, columns: 1, order: [[null]] },
    };
    const imageData = new Uint8Array([1, 2, 3, 4]);
    const resources = new Map([["images/test.png", imageData]]);

    const obzBlob = await createOBZ([board], "board-1", resources);
    const extracted = await extractOBZ(await obzBlob.arrayBuffer());

    expect(extracted.resources.get("images/test.png")).toEqual(imageData);
  });

  test("throws when rootBoardId does not match any supplied board", async () => {
    const board: OBFBoard = {
      format: "open-board-0.1",
      id: "actual-board",
      buttons: [],
      grid: { rows: 1, columns: 1, order: [[null]] },
    };

    await expect(createOBZ([board], "wrong-id")).rejects.toThrow(
      /rootBoardId "wrong-id" does not match/,
    );
  });

  test("throws when two boards share the same id", async () => {
    const makeBoard = (): OBFBoard => ({
      format: "open-board-0.1",
      id: "dup",
      buttons: [],
      grid: { rows: 1, columns: 1, order: [[null]] },
    });

    await expect(createOBZ([makeBoard(), makeBoard()], "dup")).rejects.toThrow(
      /duplicate board id "dup"/,
    );
  });

  test("throws when a supplied board fails schema validation", async () => {
    const invalidBoard = {
      format: "open-board-0.1",
      id: "bad",
      buttons: [],
      // grid is required by OBFBoardSchema
    } as unknown as OBFBoard;

    await expect(createOBZ([invalidBoard], "bad")).rejects.toThrow(
      /Invalid OBZ: board "bad" failed validation/,
    );
  });

  test("populates manifest.paths.images from board image entries", async () => {
    const board: OBFBoard = {
      format: "open-board-0.1",
      id: "b",
      buttons: [{ id: "btn", image_id: "i1" }],
      grid: { rows: 1, columns: 1, order: [["btn"]] },
      images: [{ id: "i1", path: "images/i1.png" }],
    };
    const resources = new Map([["images/i1.png", new Uint8Array([1])]]);

    const extracted = await extractOBZ(
      await (await createOBZ([board], "b", resources)).arrayBuffer(),
    );

    expect(extracted.manifest.paths.images).toEqual({ i1: "images/i1.png" });
  });

  test("populates manifest.paths.sounds from board sound entries", async () => {
    const board: OBFBoard = {
      format: "open-board-0.1",
      id: "b",
      buttons: [{ id: "btn", sound_id: "s1" }],
      grid: { rows: 1, columns: 1, order: [["btn"]] },
      sounds: [{ id: "s1", path: "sounds/s1.mp3" }],
    };
    const resources = new Map([["sounds/s1.mp3", new Uint8Array([1])]]);

    const extracted = await extractOBZ(
      await (await createOBZ([board], "b", resources)).arrayBuffer(),
    );

    expect(extracted.manifest.paths.sounds).toEqual({ s1: "sounds/s1.mp3" });
  });

  test("throws when a board image path has no matching resource", async () => {
    const board: OBFBoard = {
      format: "open-board-0.1",
      id: "b",
      buttons: [{ id: "btn", image_id: "i1" }],
      grid: { rows: 1, columns: 1, order: [["btn"]] },
      images: [{ id: "i1", path: "images/i1.png" }],
    };

    await expect(createOBZ([board], "b")).rejects.toThrow(
      /image "i1" references "images\/i1\.png" but no matching resource/,
    );
  });

  test("throws when a board sound path has no matching resource", async () => {
    const board: OBFBoard = {
      format: "open-board-0.1",
      id: "b",
      buttons: [{ id: "btn", sound_id: "s1" }],
      grid: { rows: 1, columns: 1, order: [["btn"]] },
      sounds: [{ id: "s1", path: "sounds/s1.mp3" }],
    };

    await expect(createOBZ([board], "b")).rejects.toThrow(
      /sound "s1" references "sounds\/s1\.mp3" but no matching resource/,
    );
  });

  test("throws when a resource collides with the generated manifest", async () => {
    const board: OBFBoard = {
      format: "open-board-0.1",
      id: "b",
      buttons: [],
      grid: { rows: 1, columns: 1, order: [[null]] },
    };
    const resources = new Map([["manifest.json", new Uint8Array([1])]]);

    await expect(createOBZ([board], "b", resources)).rejects.toThrow(
      /resource path "manifest\.json" collides with a generated/,
    );
  });

  test("throws when a resource collides with a generated board file", async () => {
    const board: OBFBoard = {
      format: "open-board-0.1",
      id: "b",
      buttons: [],
      grid: { rows: 1, columns: 1, order: [[null]] },
    };
    const resources = new Map([["boards/b.obf", new Uint8Array([1])]]);

    await expect(createOBZ([board], "b", resources)).rejects.toThrow(
      /resource path "boards\/b\.obf" collides with a generated/,
    );
  });

  test("omits sounds map when no sounds have paths", async () => {
    const board: OBFBoard = {
      format: "open-board-0.1",
      id: "b",
      buttons: [],
      grid: { rows: 1, columns: 1, order: [[null]] },
    };

    const extracted = await extractOBZ(
      await (await createOBZ([board], "b")).arrayBuffer(),
    );

    expect(extracted.manifest.paths.sounds).toBeUndefined();
    expect(extracted.manifest.paths.images).toEqual({});
  });

  test("throws when two boards declare the same image id with conflicting paths", async () => {
    const board1: OBFBoard = {
      format: "open-board-0.1",
      id: "b1",
      buttons: [],
      grid: { rows: 1, columns: 1, order: [[null]] },
      images: [{ id: "shared", path: "images/a.png" }],
    };
    const board2: OBFBoard = {
      format: "open-board-0.1",
      id: "b2",
      buttons: [],
      grid: { rows: 1, columns: 1, order: [[null]] },
      images: [{ id: "shared", path: "images/b.png" }],
    };

    await expect(createOBZ([board1, board2], "b1")).rejects.toThrow(
      /images id "shared" maps to conflicting paths/,
    );
  });
});

describe("Integration: createOBZ and extractOBZ", () => {
  test("round-trip preserves boards", async () => {
    const board: OBFBoard = {
      format: "open-board-0.1",
      id: "board-1",
      buttons: [{ id: "btn-1", label: "Test" }],
      grid: { rows: 1, columns: 1, order: [["btn-1"]] },
    };

    const obzBlob = await createOBZ([board], "board-1");
    const obzBuffer = await obzBlob.arrayBuffer();
    const extracted = await extractOBZ(obzBuffer);

    expect(extracted.manifest.root).toBe("boards/board-1.obf");
    expect(extracted.boards.get("board-1")).toMatchObject({
      id: "board-1",
      buttons: [{ id: "btn-1", label: "Test" }],
    });
  });

  test("round-trip handles multiple boards", async () => {
    const board1: OBFBoard = {
      format: "open-board-0.1",
      id: "board-1",
      buttons: [
        { id: "btn-1", label: "Go to 2", load_board: { id: "board-2" } },
      ],
      grid: { rows: 1, columns: 1, order: [["btn-1"]] },
    };
    const board2: OBFBoard = {
      format: "open-board-0.1",
      id: "board-2",
      buttons: [{ id: "btn-2", label: "Back" }],
      grid: { rows: 1, columns: 1, order: [["btn-2"]] },
    };

    const obzBlob = await createOBZ([board1, board2], "board-1");
    const extracted = await extractOBZ(await obzBlob.arrayBuffer());

    expect(extracted.boards.size).toBe(2);

    const extractedBoard1 = extracted.boards.get("board-1");
    expect(extractedBoard1?.buttons[0].label).toBe("Go to 2");
    expect(extractedBoard1?.buttons[0].load_board?.id).toBe("board-2");

    const extractedBoard2 = extracted.boards.get("board-2");
    expect(extractedBoard2?.buttons[0].label).toBe("Back");
  });
});
