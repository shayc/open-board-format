import { describe, expect, test } from "vitest";
import { createOBZ, extractOBZ, loadOBZ, parseManifest } from "./obz";
import type { OBFBoard } from "./schema";
import {
  expectOBFError,
  expectOBFErrorAsync,
  makeBoard,
  readFixtureArrayBuffer,
} from "./test-utils";
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

  test("throws when root is not listed in paths.boards", () => {
    const rootNotListed = JSON.stringify({
      format: "open-board-0.1",
      root: "boards/ghost.obf",
      paths: { boards: { test: "boards/test.obf" }, images: {} },
    });

    expect(expectOBFError(() => parseManifest(rootNotListed)).code).toBe(
      "invalid-manifest",
    );
  });
});

describe("extractOBZ", () => {
  test("extracts valid OBZ archive", async () => {
    const helloBoard = makeBoard({
      id: "test",
      buttons: [{ id: "btn-1", label: "Hello" }],
      grid: { rows: 1, columns: 1, order: [["btn-1"]] },
    });

    const obzBlob = await createOBZ([helloBoard], "test");
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

    expect((await expectOBFErrorAsync(extractOBZ(notZip))).code).toBe(
      "not-zip",
    );
  });

  test("throws for missing manifest.json", async () => {
    const filesWithoutManifest = new Map([
      ["boards/test.obf", new TextEncoder().encode("{}")],
    ]);
    const zipBuffer = await zip(filesWithoutManifest);

    expect(
      (await expectOBFErrorAsync(extractOBZ(zipBuffer.buffer as ArrayBuffer)))
        .code,
    ).toBe("missing-manifest");
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

    expect(
      await expectOBFErrorAsync(extractOBZ(zipBuffer.buffer as ArrayBuffer)),
    ).toMatchObject({
      code: "missing-board",
      boardId: "missing",
      path: "boards/missing.obf",
    });
  });

  test("resolves rootBoard, including when root is not the first board", async () => {
    const obzBlob = await createOBZ(
      [makeBoard({ id: "a" }), makeBoard({ id: "b" })],
      "b",
    );
    const result = await extractOBZ(await obzBlob.arrayBuffer());

    expect(result.rootBoard.id).toBe("b");
    expect(result.rootBoard).toBe(result.boards.get("b"));
  });

  test("throws when a board's id does not match its manifest key", async () => {
    const manifest = JSON.stringify({
      format: "open-board-0.1",
      root: "boards/home.obf",
      paths: { boards: { "1": "boards/home.obf" }, images: {} },
    });
    const board = JSON.stringify({
      format: "open-board-0.1",
      id: "home",
      buttons: [],
      grid: { rows: 1, columns: 1, order: [[null]] },
    });
    const files = new Map([
      ["manifest.json", new TextEncoder().encode(manifest)],
      ["boards/home.obf", new TextEncoder().encode(board)],
    ]);
    const zipBuffer = await zip(files);

    expect(
      await expectOBFErrorAsync(extractOBZ(zipBuffer.buffer as ArrayBuffer)),
    ).toMatchObject({
      code: "board-id-mismatch",
      path: "boards/home.obf",
      declaredId: "1",
      actualId: "home",
    });
  });

  test("throws when two manifest keys map to the same board file", async () => {
    const manifest = JSON.stringify({
      format: "open-board-0.1",
      root: "boards/a.obf",
      paths: { boards: { a: "boards/a.obf", b: "boards/a.obf" }, images: {} },
    });
    const board = JSON.stringify({
      format: "open-board-0.1",
      id: "a",
      buttons: [],
      grid: { rows: 1, columns: 1, order: [[null]] },
    });
    const files = new Map([
      ["manifest.json", new TextEncoder().encode(manifest)],
      ["boards/a.obf", new TextEncoder().encode(board)],
    ]);
    const zipBuffer = await zip(files);

    expect(
      await expectOBFErrorAsync(extractOBZ(zipBuffer.buffer as ArrayBuffer)),
    ).toMatchObject({
      code: "board-id-mismatch",
      path: "boards/a.obf",
      declaredId: "b",
      actualId: "a",
    });
  });
});

describe("loadOBZ", () => {
  test("loads OBZ package from File object", async () => {
    const obzBlob = await createOBZ([makeBoard({ id: "test" })], "test");
    const file = new File([obzBlob], "test.obz", { type: "application/zip" });

    const result = await loadOBZ(file);

    expect(result.manifest.root).toBe("boards/test.obf");
    expect(result.boards.get("test")).toBeDefined();
    expect(result.rootBoard.id).toBe("test");
  });
});

describe("createOBZ", () => {
  test("includes resources in archive", async () => {
    const imageData = new Uint8Array([1, 2, 3, 4]);
    const resources = new Map([["images/test.png", imageData]]);

    const obzBlob = await createOBZ(
      [makeBoard({ id: "board-1" })],
      "board-1",
      resources,
    );
    const extracted = await extractOBZ(await obzBlob.arrayBuffer());

    expect(extracted.resources.get("images/test.png")).toEqual(imageData);
  });

  test("throws when rootBoardId does not match any supplied board", async () => {
    expect(
      await expectOBFErrorAsync(
        createOBZ([makeBoard({ id: "actual-board" })], "wrong-id"),
      ),
    ).toMatchObject({ code: "unknown-root", rootBoardId: "wrong-id" });
  });

  test("throws when two boards share the same id", async () => {
    expect(
      await expectOBFErrorAsync(
        createOBZ([makeBoard({ id: "dup" }), makeBoard({ id: "dup" })], "dup"),
      ),
    ).toMatchObject({ code: "duplicate-board", boardId: "dup" });
  });

  test.each(["../evil", "a/b", "a\\b"])(
    "percent-encodes path-like board ids into a safe filename (%s)",
    async (id) => {
      const blob = await createOBZ([makeBoard({ id })], id);
      const extracted = await extractOBZ(await blob.arrayBuffer());

      const path = extracted.manifest.paths.boards[id];
      expect(path).toMatch(/^boards\/[^/\\]+\.obf$/);
      expect(extracted.rootBoard.id).toBe(id);
    },
  );

  test("throws when a supplied board fails schema validation", async () => {
    const invalidBoard = {
      format: "open-board-0.1",
      id: "bad",
      buttons: [],
      // grid is required by OBFBoardSchema
    } as unknown as OBFBoard;

    expect(
      await expectOBFErrorAsync(createOBZ([invalidBoard], "bad")),
    ).toMatchObject({ code: "invalid-board", boardId: "bad" });
  });

  test("populates manifest.paths.images from board image entries", async () => {
    const withImage = makeBoard({
      buttons: [{ id: "btn", image_id: "i1" }],
      grid: { rows: 1, columns: 1, order: [["btn"]] },
      images: [{ id: "i1", path: "images/i1.png" }],
    });
    const resources = new Map([["images/i1.png", new Uint8Array([1])]]);

    const extracted = await extractOBZ(
      await (await createOBZ([withImage], "b", resources)).arrayBuffer(),
    );

    expect(extracted.manifest.paths.images).toEqual({ i1: "images/i1.png" });
  });

  test("populates manifest.paths.sounds from board sound entries", async () => {
    const withSound = makeBoard({
      buttons: [{ id: "btn", sound_id: "s1" }],
      grid: { rows: 1, columns: 1, order: [["btn"]] },
      sounds: [{ id: "s1", path: "sounds/s1.mp3" }],
    });
    const resources = new Map([["sounds/s1.mp3", new Uint8Array([1])]]);

    const extracted = await extractOBZ(
      await (await createOBZ([withSound], "b", resources)).arrayBuffer(),
    );

    expect(extracted.manifest.paths.sounds).toEqual({ s1: "sounds/s1.mp3" });
  });

  test("throws when a board image path has no matching resource", async () => {
    const withImage = makeBoard({
      buttons: [{ id: "btn", image_id: "i1" }],
      grid: { rows: 1, columns: 1, order: [["btn"]] },
      images: [{ id: "i1", path: "images/i1.png" }],
    });

    expect(
      await expectOBFErrorAsync(createOBZ([withImage], "b")),
    ).toMatchObject({
      code: "missing-resource",
      kind: "image",
      mediaId: "i1",
      path: "images/i1.png",
    });
  });

  test("throws when a board sound path has no matching resource", async () => {
    const withSound = makeBoard({
      buttons: [{ id: "btn", sound_id: "s1" }],
      grid: { rows: 1, columns: 1, order: [["btn"]] },
      sounds: [{ id: "s1", path: "sounds/s1.mp3" }],
    });

    expect(
      await expectOBFErrorAsync(createOBZ([withSound], "b")),
    ).toMatchObject({
      code: "missing-resource",
      kind: "sound",
      mediaId: "s1",
      path: "sounds/s1.mp3",
    });
  });

  test("throws when a resource collides with the generated manifest", async () => {
    const resources = new Map([["manifest.json", new Uint8Array([1])]]);

    expect(
      await expectOBFErrorAsync(createOBZ([makeBoard()], "b", resources)),
    ).toMatchObject({ code: "path-collision", path: "manifest.json" });
  });

  test("throws when a resource collides with a generated board file", async () => {
    const resources = new Map([["boards/b.obf", new Uint8Array([1])]]);

    expect(
      await expectOBFErrorAsync(createOBZ([makeBoard()], "b", resources)),
    ).toMatchObject({ code: "path-collision", path: "boards/b.obf" });
  });

  test("omits sounds map when no sounds have paths", async () => {
    const extracted = await extractOBZ(
      await (await createOBZ([makeBoard()], "b")).arrayBuffer(),
    );

    expect(extracted.manifest.paths.sounds).toBeUndefined();
    expect(extracted.manifest.paths.images).toEqual({});
  });

  test("includes path-bearing media but skips url/data-only entries", async () => {
    const board = makeBoard({
      buttons: [{ id: "btn", image_id: "kept" }],
      grid: { rows: 1, columns: 1, order: [["btn"]] },
      images: [
        { id: "kept", path: "images/kept.png" },
        { id: "url-only", url: "https://example.com/x.png" },
        { id: "data-only", data: "data:image/png;base64,AAAA" },
      ],
    });
    const resources = new Map([["images/kept.png", new Uint8Array([1])]]);

    const extracted = await extractOBZ(
      await (await createOBZ([board], "b", resources)).arrayBuffer(),
    );

    // Only the path-bearing entry survives; url/data-only media are skipped.
    expect(extracted.manifest.paths.images).toStrictEqual({
      kept: "images/kept.png",
    });
  });

  test("throws when two boards declare the same image id with conflicting paths", async () => {
    const board1 = makeBoard({
      id: "b1",
      images: [{ id: "shared", path: "images/a.png" }],
    });
    const board2 = makeBoard({
      id: "b2",
      images: [{ id: "shared", path: "images/b.png" }],
    });

    expect(
      await expectOBFErrorAsync(createOBZ([board1, board2], "b1")),
    ).toMatchObject({
      code: "conflicting-paths",
      kind: "image",
      mediaId: "shared",
      paths: ["images/a.png", "images/b.png"],
    });
  });

  test("throws when two boards declare the same sound id with conflicting paths", async () => {
    const board1 = makeBoard({
      id: "b1",
      sounds: [{ id: "shared", path: "sounds/a.mp3" }],
    });
    const board2 = makeBoard({
      id: "b2",
      sounds: [{ id: "shared", path: "sounds/b.mp3" }],
    });

    expect(
      await expectOBFErrorAsync(createOBZ([board1, board2], "b1")),
    ).toMatchObject({
      code: "conflicting-paths",
      kind: "sound",
      mediaId: "shared",
      paths: ["sounds/a.mp3", "sounds/b.mp3"],
    });
  });
});

describe("Integration: createOBZ and extractOBZ", () => {
  test("round-trip handles multiple boards", async () => {
    const board1 = makeBoard({
      id: "board-1",
      buttons: [
        { id: "btn-1", label: "Go to 2", load_board: { id: "board-2" } },
      ],
      grid: { rows: 1, columns: 1, order: [["btn-1"]] },
    });
    const board2 = makeBoard({
      id: "board-2",
      buttons: [{ id: "btn-2", label: "Back" }],
      grid: { rows: 1, columns: 1, order: [["btn-2"]] },
    });

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

describe("Integration: Real-world OBZ package", () => {
  const FIXTURE = "lots-of-stuff.obz";

  test("resolves all five boards keyed by manifest id, including id-mismatched filenames", async () => {
    const { boards } = await extractOBZ(readFixtureArrayBuffer(FIXTURE));

    expect(boards.size).toBe(5);
    expect(boards.get("lots_of_stuff")?.name).toBe("Lots of Stuff Board"); // root_board.obf
    expect(boards.get("link")?.name).toBe("Linked Board"); // linked_board.obf
    expect(boards.get("path_images_and_sounds")?.name).toBe(
      "Path Images and Sounds Board",
    ); // path_images.obf
  });

  test("resolves the root board declared by the foreign manifest", async () => {
    const { rootBoard, boards, manifest } = await extractOBZ(
      readFixtureArrayBuffer(FIXTURE),
    );

    expect(manifest.root).toBe("boards/root_board.obf");
    expect(rootBoard.id).toBe("lots_of_stuff");
    expect(rootBoard).toBe(boards.get("lots_of_stuff"));
  });

  test("parses the foreign manifest's path tables faithfully", async () => {
    const { manifest } = await extractOBZ(readFixtureArrayBuffer(FIXTURE));

    expect(manifest.format).toBe("open-board-0.1");
    expect(manifest.paths.boards).toEqual({
      lots_of_stuff: "boards/root_board.obf",
      url_images: "boards/url_images.obf",
      inline_images: "boards/inline_images.obf",
      path_images_and_sounds: "boards/path_images.obf",
      link: "boards/linked_board.obf",
    });
    expect(manifest.paths.images).toEqual({
      "9": "images/happy.png",
      "11": "images/sad.png",
    });
    // Two distinct sound ids legitimately map to the same file.
    expect(manifest.paths.sounds).toEqual({
      sl3: "sounds/sigh.mp3",
      ss2: "sounds/sigh.mp3",
    });
  });

  test("preserves binary media resources as raw bytes", async () => {
    const { resources } = await extractOBZ(readFixtureArrayBuffer(FIXTURE));

    expect(resources.has("manifest.json")).toBe(true);
    expect(resources.has("boards/root_board.obf")).toBe(true);

    const happy = resources.get("images/happy.png");
    expect(happy?.byteLength).toBe(30987);
    // PNG magic number — proves the bytes are the real decompressed image.
    expect(Array.from(happy?.slice(0, 4) ?? [])).toEqual([
      0x89, 0x50, 0x4e, 0x47,
    ]);

    expect(resources.get("images/sad.png")?.byteLength).toBe(26652);
    expect(resources.get("sounds/sigh.mp3")?.byteLength).toBe(14674);
  });

  test("preserves load_board navigation links (path-based and remote)", async () => {
    const { boards } = await extractOBZ(readFixtureArrayBuffer(FIXTURE));
    const root = boards.get("lots_of_stuff");

    const pathLinks = (root?.buttons ?? [])
      .map((button) => button.load_board?.path)
      .filter((path): path is string => path !== undefined);
    expect(pathLinks).toEqual([
      "boards/url_images.obf",
      "boards/inline_images.obf",
    ]);
    expect(boards.get("url_images")).toBeDefined();

    const remote = root?.buttons.find(
      (button) => button.load_board?.url,
    )?.load_board;
    expect(remote?.url).toBe("http://www.example.com/load_board");
    expect(remote?.data_url).toBe(
      "http://www.example.com/download/load_board.obf?auth=asdfjkl",
    );
    expect(remote?.path).toBeUndefined();
  });

  test("preserves mixed media reference styles and coerces numeric ids", async () => {
    const { boards } = await extractOBZ(readFixtureArrayBuffer(FIXTURE));

    const linkedImages = boards.get("link")?.images ?? [];
    expect(linkedImages.find((image) => image.id === "i9")?.data).toMatch(
      /^data:image\/png/,
    );
    expect(linkedImages.find((image) => image.id === "i11")?.url).toBeDefined();
    expect(linkedImages.find((image) => image.id === "i42")?.symbol).toEqual({
      set: "mypics",
      filename: "hat.ico",
    });

    // Numeric image ids in inline_images.obf are coerced to strings.
    const inlineImageIds = boards
      .get("inline_images")
      ?.images?.map((image) => image.id);
    expect(inlineImageIds).toEqual(["99", "119"]);
  });
});
