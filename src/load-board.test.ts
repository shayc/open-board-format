import { describe, expect, test, vi } from "vitest";
import { loadBoard } from "./load-board";
import { createOBZ } from "./obz";
import {
  expectOBFErrorAsync,
  makeBoard,
  readFixtureArrayBuffer,
} from "./test-utils";
import { zip } from "./zip";

const validBoard = makeBoard({
  id: "test-board",
  buttons: [{ id: "btn-1", label: "Hello" }],
  grid: { rows: 1, columns: 1, order: [["btn-1"]] },
});

describe("loadBoard", () => {
  test("loads a single OBF board from a File", async () => {
    const file = new File([JSON.stringify(validBoard)], "test.obf");

    const loaded = await loadBoard(file);

    expect(loaded).toEqual({ format: "obf", board: validBoard });
  });

  test("loads an OBZ package from a File", async () => {
    const obzBlob = await createOBZ([validBoard], "test-board");
    const file = new File([obzBlob], "test.obz");

    const loaded = await loadBoard(file);

    expect(loaded.format).toBe("obz");
    if (loaded.format !== "obz") {
      throw new Error("expected obz");
    }
    expect(loaded.archive.manifest.root).toBe("boards/test-board.obf");
    expect(loaded.archive.boards.get("test-board")).toEqual(validBoard);
    expect(loaded.archive.rootBoard).toBe(
      loaded.archive.boards.get("test-board"),
    );
  });

  test("loads a single OBF board from a Blob", async () => {
    const blob = new Blob([JSON.stringify(validBoard)]);

    const loaded = await loadBoard(blob);

    expect(loaded).toEqual({ format: "obf", board: validBoard });
  });

  test("loads a single OBF board from an ArrayBuffer", async () => {
    const bytes = new TextEncoder().encode(JSON.stringify(validBoard));
    const buffer = bytes.buffer.slice(0, bytes.byteLength);

    const loaded = await loadBoard(buffer);

    expect(loaded).toEqual({ format: "obf", board: validBoard });
  });

  test("loads a single OBF board from a Uint8Array view offset into a larger buffer", async () => {
    const json = JSON.stringify(validBoard);
    const bytes = new TextEncoder().encode(json);
    const padded = new Uint8Array(bytes.byteLength + 10);
    padded.set(bytes, 10);
    const view = padded.subarray(10);

    const loaded = await loadBoard(view);

    expect(loaded).toEqual({ format: "obf", board: validBoard });
  });

  test("detects format by content, not by file extension", async () => {
    const obzBlob = await createOBZ([validBoard], "test-board");
    const file = new File([obzBlob], "actually-a-package.obf");

    const loaded = await loadBoard(file);

    expect(loaded.format).toBe("obz");
  });

  test("reads the file exactly once", async () => {
    const file = new File([JSON.stringify(validBoard)], "test.obf");
    const arrayBuffer = vi.spyOn(file, "arrayBuffer");

    await loadBoard(file);

    expect(arrayBuffer).toHaveBeenCalledTimes(1);
  });

  test("surfaces the OBF parser's error for a non-ZIP malformed board", async () => {
    const file = new File(['{ "format": "open-board-0.1", }'], "bad.obf");

    expect((await expectOBFErrorAsync(loadBoard(file))).code).toBe("not-json");
  });

  test("loads the real-world lots-of-stuff.obz package end to end", async () => {
    const loaded = await loadBoard(readFixtureArrayBuffer("lots-of-stuff.obz"));

    expect(loaded.format).toBe("obz");
    if (loaded.format !== "obz") {
      throw new Error("expected obz");
    }
    expect(loaded.archive.boards.size).toBe(5);
    expect(loaded.archive.rootBoard.id).toBe("lots_of_stuff");
  });

  test("surfaces the OBZ extractor's error for a ZIP missing its manifest", async () => {
    // A real ZIP so isZip passes and we exercise the OBZ branch, not the OBF one.
    const zipped = await zip(
      new Map([["boards/x.obf", new TextEncoder().encode("{}")]]),
    );
    const file = new File([zipped], "no-manifest.obz");

    expect((await expectOBFErrorAsync(loadBoard(file))).code).toBe(
      "missing-manifest",
    );
  });
});
