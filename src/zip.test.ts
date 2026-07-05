import { describe, expect, test } from "vitest";
import { expectOBFErrorAsync } from "./test-utils";
import { isZip, toArrayBuffer, unzip, zip } from "./zip";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Helper to safely extract an ArrayBuffer from a Uint8Array,
 * avoiding typed-array .buffer footguns with offset/length mismatches.
 */
function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

describe("isZip", () => {
  test("returns true for buffer starting with PK signature (0x50, 0x4b)", () => {
    const pkSignature = new Uint8Array([0x50, 0x4b]).buffer;

    expect(isZip(pkSignature)).toBe(true);
  });

  test("returns false for non-PK data", () => {
    const notPk = new Uint8Array([0x00, 0x00, 0x00, 0x00]).buffer;

    expect(isZip(notPk)).toBe(false);
  });

  test.each([
    ["empty", [] as number[]],
    ["1-byte", [0x50]],
  ])(
    "returns false for %s buffer (shorter than the 2-byte PK signature)",
    (_label, bytes) => {
      expect(isZip(new Uint8Array(bytes).buffer)).toBe(false);
    },
  );

  test("returns true for PK followed by arbitrary bytes (false positive accepted)", () => {
    const pkFollowedByJunk = new Uint8Array([0x50, 0x4b, 0xff, 0xff, 0x00])
      .buffer;

    expect(isZip(pkFollowedByJunk)).toBe(true);
  });
});

describe("zip", () => {
  test("creates readable ZIP archive with expected file and content", async () => {
    const testContent = encoder.encode("test file content");
    const files = new Map<string, Uint8Array>([["test.txt", testContent]]);

    const zipped = await zip(files);
    const roundTripped = await unzip(bytesToArrayBuffer(zipped));

    expect(roundTripped.size).toBe(1);
    const bytes = roundTripped.get("test.txt");
    expect(bytes).toBeDefined();
    expect(decoder.decode(bytes)).toBe("test file content");
  });

  test("accepts ArrayBuffer input and round-trips content correctly", async () => {
    const textContent = encoder.encode("arraybuffer content");
    const arrayBufferContent: ArrayBuffer = textContent.buffer.slice(
      textContent.byteOffset,
      textContent.byteOffset + textContent.byteLength,
    );
    const files = new Map<string, Uint8Array | ArrayBuffer>([
      ["from-arraybuffer.txt", arrayBufferContent],
    ]);

    const zipped = await zip(files);
    const roundTripped = await unzip(bytesToArrayBuffer(zipped));

    expect(roundTripped.size).toBe(1);
    const bytes = roundTripped.get("from-arraybuffer.txt");
    expect(bytes).toBeDefined();
    expect(decoder.decode(bytes)).toBe("arraybuffer content");
  });
});

describe("unzip", () => {
  test("rejects with an unreadable-zip OBFError for invalid data", async () => {
    const invalidData = bytesToArrayBuffer(
      new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04]),
    );

    expect((await expectOBFErrorAsync(unzip(invalidData))).code).toBe(
      "unreadable-zip",
    );
  });

  test("drops directory entries, keeping only file paths", async () => {
    const files = new Map<string, Uint8Array>([
      ["folder/", new Uint8Array(0)],
      ["folder/file.txt", encoder.encode("content")],
    ]);

    const zipped = await zip(files);
    const unzipped = await unzip(bytesToArrayBuffer(zipped));

    expect([...unzipped.keys()]).toEqual(["folder/file.txt"]);
  });
});

describe("toArrayBuffer", () => {
  test("returns an ArrayBuffer input unchanged", async () => {
    const original = new Uint8Array([1, 2, 3]).buffer;

    expect(await toArrayBuffer(original)).toBe(original);
  });

  test("slices a Uint8Array view to its own window, ignoring surrounding bytes", async () => {
    const padded = new Uint8Array([0xff, 0xff, 1, 2, 3, 0xff]);
    const view = padded.subarray(2, 5);

    const result = await toArrayBuffer(view);

    expect(new Uint8Array(result)).toEqual(new Uint8Array([1, 2, 3]));
  });

  test("reads a Blob via its arrayBuffer() method", async () => {
    const blob = new Blob([new Uint8Array([4, 5, 6])]);

    const result = await toArrayBuffer(blob);

    expect(new Uint8Array(result)).toEqual(new Uint8Array([4, 5, 6]));
  });
});

describe("Integration: zip and unzip", () => {
  test("round-trip preserves file contents and structure", async () => {
    const testContent = encoder.encode("test file content");
    const files = new Map<string, Uint8Array>([
      ["folder/file.txt", testContent],
      ["root.json", encoder.encode('{"key":"value"}')],
    ]);

    const zipped = await zip(files);
    const unzipped = await unzip(bytesToArrayBuffer(zipped));

    expect(unzipped.size).toBe(files.size);

    const folderFile = unzipped.get("folder/file.txt");
    expect(folderFile).toBeDefined();
    expect(decoder.decode(folderFile)).toBe("test file content");

    const rootJson = unzipped.get("root.json");
    expect(rootJson).toBeDefined();
    expect(decoder.decode(rootJson)).toBe('{"key":"value"}');
  });
});
