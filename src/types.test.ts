/**
 * Type-level contract for the public data types.
 *
 * Every object type's fields are written out by hand, so any change to what
 * consumers see (a field becoming optional, widening to `unknown`, a Zod
 * upgrade changing an inferred type) fails `npm run typecheck`. The shape
 * types in `src/schema.ts` are the source of the public types, and the
 * compiler only checks the runtime schemas against them in one direction, so
 * this file is what pins the shape types themselves.
 *
 * The assertions are checked by `tsc`; at runtime they are no-ops.
 */

import { describe, expectTypeOf, test } from "vitest";
import type { z } from "zod";
import type {
  OBFBoard,
  OBFButton,
  OBFGrid,
  OBFImage,
  OBFLicense,
  OBFLoadBoard,
  OBFManifest,
  OBFMedia,
  OBFSound,
  OBFSymbolInfo,
} from "./schema";
import type {
  OBFBoardSchema,
  OBFButtonSchema,
  OBFGridSchema,
  OBFImageSchema,
} from "./schema";

type Loose = { [k: string]: unknown };

type ExpectedLicense = Loose & {
  type: string;
  copyright_notice_url?: string | undefined;
  source_url?: string | undefined;
  author_name?: string | undefined;
  author_url?: string | undefined;
  author_email?: string | undefined;
};

type ExpectedMedia = Loose & {
  id: string;
  data?: string | undefined;
  path?: string | undefined;
  data_url?: string | undefined;
  url?: string | undefined;
  content_type?: string | undefined;
  license?: ExpectedLicense | undefined;
};

type ExpectedSymbolInfo = Loose & { set: string; filename: string };

type ExpectedImage = ExpectedMedia & {
  symbol?: ExpectedSymbolInfo | undefined;
  width?: number | undefined;
  height?: number | undefined;
};

type ExpectedLoadBoard = Loose & {
  id?: string | undefined;
  name?: string | undefined;
  data_url?: string | undefined;
  url?: string | undefined;
  path?: string | undefined;
};

type ExpectedButton = Loose & {
  id: string;
  label?: string | undefined;
  vocalization?: string | undefined;
  image_id?: string | undefined;
  sound_id?: string | undefined;
  action?: string | undefined;
  actions?: string[] | undefined;
  load_board?: ExpectedLoadBoard | undefined;
  background_color?: string | undefined;
  border_color?: string | undefined;
  top?: number | undefined;
  left?: number | undefined;
  width?: number | undefined;
  height?: number | undefined;
};

type ExpectedGrid = Loose & {
  rows: number;
  columns: number;
  order: (string | null)[][];
};

type ExpectedBoard = Loose & {
  format: string;
  id: string;
  locale?: string | undefined;
  buttons: ExpectedButton[];
  url?: string | undefined;
  name?: string | undefined;
  description_html?: string | undefined;
  grid: ExpectedGrid;
  images?: ExpectedImage[] | undefined;
  sounds?: ExpectedMedia[] | undefined;
  license?: ExpectedLicense | undefined;
  strings?: Record<string, Record<string, string>> | undefined;
};

type ExpectedManifest = Loose & {
  format: string;
  root: string;
  paths: Loose & {
    boards: Record<string, string>;
    images?: Record<string, string> | undefined;
    sounds?: Record<string, string> | undefined;
  };
};

/** Flattens an intersection so it compares equal to a single object type. */
type Flat<T> = T extends object
  ? T extends readonly unknown[]
    ? { [K in keyof T]: Flat<T[K]> }
    : { [K in keyof T]: Flat<T[K]> }
  : T;

describe("public types", () => {
  test("object types match the documented contract", () => {
    expectTypeOf<Flat<OBFLicense>>().toEqualTypeOf<Flat<ExpectedLicense>>();
    expectTypeOf<Flat<OBFMedia>>().toEqualTypeOf<Flat<ExpectedMedia>>();
    expectTypeOf<Flat<OBFSound>>().toEqualTypeOf<Flat<ExpectedMedia>>();
    expectTypeOf<Flat<OBFSymbolInfo>>().toEqualTypeOf<
      Flat<ExpectedSymbolInfo>
    >();
    expectTypeOf<Flat<OBFImage>>().toEqualTypeOf<Flat<ExpectedImage>>();
    expectTypeOf<Flat<OBFLoadBoard>>().toEqualTypeOf<Flat<ExpectedLoadBoard>>();
    expectTypeOf<Flat<OBFButton>>().toEqualTypeOf<Flat<ExpectedButton>>();
    expectTypeOf<Flat<OBFGrid>>().toEqualTypeOf<Flat<ExpectedGrid>>();
    expectTypeOf<Flat<OBFBoard>>().toEqualTypeOf<Flat<ExpectedBoard>>();
    expectTypeOf<Flat<OBFManifest>>().toEqualTypeOf<Flat<ExpectedManifest>>();
  });

  test("schema inputs accept numeric IDs", () => {
    expectTypeOf<z.input<typeof OBFButtonSchema>["id"]>().toEqualTypeOf<
      string | number
    >();
    expectTypeOf<z.input<typeof OBFButtonSchema>["image_id"]>().toEqualTypeOf<
      string | number | undefined
    >();
    expectTypeOf<
      z.input<typeof OBFGridSchema>["order"][number][number]
    >().toEqualTypeOf<string | number | null>();
  });

  test("nested values are assignable to the named types", () => {
    expectTypeOf<OBFBoard["buttons"][number]>().toExtend<OBFButton>();
    expectTypeOf<
      NonNullable<OBFBoard["images"]>[number]
    >().toExtend<OBFImage>();
    expectTypeOf<OBFBoard["grid"]>().toExtend<OBFGrid>();
    expectTypeOf<z.output<typeof OBFBoardSchema>>().toExtend<OBFBoard>();
    expectTypeOf<z.output<typeof OBFImageSchema>>().toExtend<OBFImage>();
  });
});
