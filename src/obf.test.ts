import { describe, expect, test } from "vitest";
import { OBFError } from "./errors";
import { loadOBF, parseOBF, stringifyOBF, validateOBF } from "./obf";
import type { OBFBoard } from "./schema";
import { expectOBFError } from "./test-utils";

const validBoard: OBFBoard = {
  format: "open-board-0.1",
  id: "test-board",
  buttons: [{ id: "btn-1", label: "Hello" }],
  grid: { rows: 1, columns: 1, order: [["btn-1"]] },
  // ext_ keys are spec-blessed extension fields and must survive round-trip.
  ext_speaker_color: "blue",
};

describe("parseOBF", () => {
  test("parses valid JSON board", () => {
    const json = JSON.stringify(validBoard);
    const result = parseOBF(json);

    expect(result).toEqual(validBoard);
  });

  test("throws a not-json OBFError for invalid JSON, preserving the cause", () => {
    let thrown: unknown;
    try {
      parseOBF('{ "format": "open-board-0.1", }');
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(OBFError);
    expect((thrown as OBFError).info).toMatchObject({
      code: "not-json",
      source: "board",
    });
    expect((thrown as OBFError).cause).toBeInstanceOf(SyntaxError);
  });

  test("handles UTF-8 BOM prefix", () => {
    const jsonWithBom = "\uFEFF" + JSON.stringify(validBoard);
    const result = parseOBF(jsonWithBom);

    expect(result).toEqual(validBoard);
  });
});

describe("validateOBF", () => {
  test("accepts valid board structure", () => {
    expect(() => validateOBF(validBoard)).not.toThrow();
  });

  test("throws for missing required grid field", () => {
    const boardWithoutGrid: unknown = {
      format: "open-board-0.1",
      id: "test-board",
      buttons: [],
    };

    expect(expectOBFError(() => validateOBF(boardWithoutGrid)).code).toBe(
      "invalid-board",
    );
  });
});

describe("loadOBF", () => {
  test("loads board from File object", async () => {
    const json = JSON.stringify(validBoard);
    const file = new File([json], "test.obf", { type: "application/json" });

    const result = await loadOBF(file);

    expect(result).toEqual(validBoard);
  });
});

describe("OBF round-trip", () => {
  test("round-trip preserves data", () => {
    const json = stringifyOBF(validBoard);
    const parsed = parseOBF(json);

    expect(parsed).toEqual(validBoard);
  });

  test("round-trip preserves ext_ fields at button level", () => {
    const boardWithButtonExt: OBFBoard = {
      format: "open-board-0.1",
      id: "ext-button-board",
      buttons: [{ id: "b1", label: "Hi", ext_myapp_anim: "fade" }],
      grid: { rows: 1, columns: 1, order: [["b1"]] },
    };

    const parsed = parseOBF(stringifyOBF(boardWithButtonExt));
    expect((parsed.buttons[0] as Record<string, unknown>).ext_myapp_anim).toBe(
      "fade",
    );
  });
});
