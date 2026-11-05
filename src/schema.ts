/**
 * Zod schemas for the Open Board Format (OBF) data model.
 *
 * Every object schema is built with {@link obfObject} from a named shape type
 * (`OBFButtonShape`, …) that holds its field docs. TypeScript drops JSDoc from
 * object literals when it emits declarations, so the shape types are what
 * carry field docs into the published types and consumers' editor hovers.
 * Document fields on the shape type, not on the schema literal.
 *
 * Official OBF specification: https://www.openboardformat.org/docs
 */

import { z } from "zod";

/**
 * Builds a loose object schema whose declared type is exactly `Shape`, so the
 * JSDoc on `Shape`'s fields survives declaration emit.
 *
 * The type argument is required: omitting it falls back to `never`, which no
 * shape satisfies. `NoInfer` makes TypeScript check the shape literal against
 * `Shape` instead of inferring from it, so a missing, extra, or wrongly typed
 * field is a compile error at that field.
 */
function obfObject<Shape extends z.core.$ZodLooseShape = never>(
  shape: NoInfer<Shape>,
): z.ZodObject<Shape, z.core.$loose> {
  // `z.looseObject` returns `ZodObject<Writeable<Shape>>`, which only strips
  // `readonly` modifiers. Shape types declare none, so this cast is exact.
  return z.looseObject(shape) as z.ZodObject<Shape, z.core.$loose>;
}

/** Optional URL that treats empty strings as undefined. */
const OBFOptionalUrlSchema = z
  .union([z.url(), z.literal("")])
  .transform((val) => (val === "" ? undefined : val))
  .optional();

/** Optional email that treats empty strings as undefined. */
const OBFOptionalEmailSchema = z
  .union([z.email(), z.literal("")])
  .transform((val) => (val === "" ? undefined : val))
  .optional();

/** Optional ID that treats empty strings as undefined. */
const OBFOptionalIDSchema = z
  .union([z.string(), z.number()])
  .transform((val) => {
    const str = String(val);
    return str === "" ? undefined : str;
  })
  .optional();

/** Unique board-element identifier, coerced to a non-empty string. */
export const OBFIDSchema = z
  .union([z.string(), z.number()])
  .transform((val) => String(val))
  .pipe(z.string().min(1));

/** Unique board-element identifier, coerced to a non-empty string. See {@link OBFIDSchema}. */
export type OBFID = z.infer<typeof OBFIDSchema>;

/** Format version of the Open Board Format, e.g., `open-board-0.1`. */
export const OBFFormatVersionSchema = z.string().regex(/^open-board-.+$/);

/** Format version of the Open Board Format, e.g., `open-board-0.1`. See {@link OBFFormatVersionSchema}. */
export type OBFFormatVersion = z.infer<typeof OBFFormatVersionSchema>;

/**
 * Locale identifier, typically a BCP 47 language tag (e.g., `en`, `en-US`,
 * `fr-CA`). Not strictly validated — any string is accepted.
 */
export const OBFLocaleCodeSchema = z.string();

/** Locale identifier, typically a BCP 47 language tag; accepts any string. See {@link OBFLocaleCodeSchema}. */
export type OBFLocaleCode = z.infer<typeof OBFLocaleCodeSchema>;

/**
 * Translations for a single locale, keyed by the source string,
 * e.g., `{ "hello": "hola" }`.
 */
export const OBFLocalizedStringsSchema = z.record(z.string(), z.string());

/** Translations for a single locale, keyed by the source string. See {@link OBFLocalizedStringsSchema}. */
export type OBFLocalizedStrings = z.infer<typeof OBFLocalizedStringsSchema>;

/**
 * Locale-keyed dictionary of translated strings,
 * e.g., `{ en: { greeting: "Hello" }, fr: { greeting: "Bonjour" } }`.
 */
export const OBFStringsSchema = z.record(z.string(), OBFLocalizedStringsSchema);

/** Locale-keyed dictionary of translated strings. See {@link OBFStringsSchema}. */
export type OBFStrings = z.infer<typeof OBFStringsSchema>;

/**
 * Spelling action: a `+` prefix followed by the text to append,
 * e.g., `+hello`.
 */
export const OBFSpellingActionSchema = z.string().regex(/^\+.+$/);

/** Spelling action: a `+` prefix followed by the text to append, e.g., `+hello`. See {@link OBFSpellingActionSchema}. */
export type OBFSpellingAction = z.infer<typeof OBFSpellingActionSchema>;

/**
 * Specialty action prefixed with `:`, e.g., `:clear`.
 * Custom extensions use the `:ext_` prefix.
 */
export const OBFSpecialtyActionSchema = z
  .string()
  .regex(/^:[a-z][a-z0-9_-]*$/i);

/** Specialty action prefixed with `:`, e.g., `:clear`. See {@link OBFSpecialtyActionSchema}. */
export type OBFSpecialtyAction = z.infer<typeof OBFSpecialtyActionSchema>;

/** Union of spelling and specialty actions that a button can trigger. */
export const OBFButtonActionSchema = z.union([
  OBFSpellingActionSchema,
  OBFSpecialtyActionSchema,
]);

/** Union of spelling and specialty actions that a button can trigger. See {@link OBFButtonActionSchema}. */
export type OBFButtonAction = z.infer<typeof OBFButtonActionSchema>;

/** Fields of {@link OBFLicenseSchema}. */
type OBFLicenseShape = {
  /** Type of the license, e.g., `CC-BY-SA`. */
  type: z.ZodString;
  /** URL to the license terms. Must be a valid URL; an empty string parses to `undefined`. */
  copyright_notice_url: typeof OBFOptionalUrlSchema;
  /** Source URL of the resource. Must be a valid URL; an empty string parses to `undefined`. */
  source_url: typeof OBFOptionalUrlSchema;
  /** Name of the author. */
  author_name: z.ZodOptional<z.ZodString>;
  /** URL of the author's webpage. Must be a valid URL; an empty string parses to `undefined`. */
  author_url: typeof OBFOptionalUrlSchema;
  /** Email address of the author. Must be a valid email address; an empty string parses to `undefined`. */
  author_email: typeof OBFOptionalEmailSchema;
};

/** License terms and attribution for a resource. */
export const OBFLicenseSchema = obfObject<OBFLicenseShape>({
  type: z.string(),
  copyright_notice_url: OBFOptionalUrlSchema,
  source_url: OBFOptionalUrlSchema,
  author_name: z.string().optional(),
  author_url: OBFOptionalUrlSchema,
  author_email: OBFOptionalEmailSchema,
});

/** License terms and attribution for a resource. See {@link OBFLicenseSchema}. */
export interface OBFLicense extends z.infer<typeof OBFLicenseSchema> {}

/** Fields of {@link OBFMediaSchema}. */
type OBFMediaShape = {
  /** Unique identifier for the media resource. A non-empty string, or a number converted to a string. */
  id: typeof OBFIDSchema;
  /** Media data inlined as a `data:` URI. */
  data: z.ZodOptional<z.ZodString>;
  /** Path to the media file within an `.obz` package. */
  path: z.ZodOptional<z.ZodString>;
  /**
   * URL of an API endpoint for fetching the media programmatically —
   * not a `data:` URI (that is `data`). Must be a valid URL; an empty string
   * parses to `undefined`.
   */
  data_url: typeof OBFOptionalUrlSchema;
  /** URL to the media resource. Must be a valid URL; an empty string parses to `undefined`. */
  url: typeof OBFOptionalUrlSchema;
  /** MIME type of the media, e.g., `image/png`, `audio/mpeg`. */
  content_type: z.ZodOptional<z.ZodString>;
  /** Licensing information for the media. */
  license: z.ZodOptional<typeof OBFLicenseSchema>;
};

/**
 * Common properties for media resources (images and sounds).
 *
 * Resolve multiple references in this order:
 *
 * 1. `data`
 * 2. `path`
 * 3. `url`
 *
 * `data_url` is not part of this fallback chain — it is an API endpoint for
 * retrieving information about the resource, not an alternative source of
 * the media bytes.
 */
export const OBFMediaSchema = obfObject<OBFMediaShape>({
  id: OBFIDSchema,
  data: z.string().optional(),
  path: z.string().optional(),
  data_url: OBFOptionalUrlSchema,
  url: OBFOptionalUrlSchema,
  content_type: z.string().optional(),
  license: OBFLicenseSchema.optional(),
});

/** Common properties for media resources (images and sounds). See {@link OBFMediaSchema}. */
export interface OBFMedia extends z.infer<typeof OBFMediaSchema> {}

/** Fields of {@link OBFSymbolInfoSchema}. */
type OBFSymbolInfoShape = {
  /** Name of the symbol set, e.g., `symbolstix`. */
  set: z.ZodString;
  /** Filename of the symbol within the set. */
  filename: z.ZodString;
};

/** Reference to a symbol in a proprietary symbol set (e.g., SymbolStix). */
export const OBFSymbolInfoSchema = obfObject<OBFSymbolInfoShape>({
  set: z.string(),
  filename: z.string(),
});

/** Reference to a symbol in a proprietary symbol set. See {@link OBFSymbolInfoSchema}. */
export interface OBFSymbolInfo extends z.infer<typeof OBFSymbolInfoSchema> {}

/** Fields that {@link OBFImageSchema} adds to {@link OBFMediaSchema}. */
type OBFImageOwnShape = {
  /** Information about a symbol from a proprietary symbol set. */
  symbol: z.ZodOptional<typeof OBFSymbolInfoSchema>;
  /** Width of the image in pixels. */
  width: z.ZodOptional<z.ZodNumber>;
  /** Height of the image in pixels. */
  height: z.ZodOptional<z.ZodNumber>;
};

/**
 * Fields of {@link OBFImageSchema}: the media fields plus its own, merged
 * into one object type as Zod's `.extend()` does. The mapped type keeps each
 * field's JSDoc. It is written out here rather than as a generic helper so
 * that declarations keep the `OBFImageShape` name.
 */
type OBFImageShape = {
  [K in keyof (OBFMediaShape & OBFImageOwnShape)]: (OBFMediaShape &
    OBFImageOwnShape)[K];
};

/**
 * Image resource, extending {@link OBFMediaSchema} with optional
 * symbol and dimension properties.
 *
 * Resolve multiple image sources in this order:
 *
 * 1. `data`
 * 2. `path`
 * 3. `url`
 * 4. `symbol`
 */
export const OBFImageSchema = obfObject<OBFImageShape>({
  ...OBFMediaSchema.shape,
  symbol: OBFSymbolInfoSchema.optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

/** Image resource with optional symbol and dimension properties. See {@link OBFImageSchema}. */
export interface OBFImage extends z.infer<typeof OBFImageSchema> {}

/**
 * Audio resource. Identical to {@link OBFMediaSchema} — no additional properties.
 */
export const OBFSoundSchema = OBFMediaSchema;

/** Audio resource, identical to {@link OBFMediaSchema}. See {@link OBFSoundSchema}. */
export interface OBFSound extends z.infer<typeof OBFSoundSchema> {}

/** Fields of {@link OBFLoadBoardSchema}. */
type OBFLoadBoardShape = {
  /**
   * Unique identifier of the board to load. A string, or a number converted
   * to a string; an empty string parses to `undefined`.
   */
  id: typeof OBFOptionalIDSchema;
  /** Name of the board to load. */
  name: z.ZodOptional<z.ZodString>;
  /**
   * URL of an API endpoint for fetching the board programmatically —
   * not a `data:` URI. Must be a valid URL; an empty string parses to
   * `undefined`.
   */
  data_url: typeof OBFOptionalUrlSchema;
  /** URL to access the board via a web browser. Must be a valid URL; an empty string parses to `undefined`. */
  url: typeof OBFOptionalUrlSchema;
  /** Path to the board within an `.obz` package. */
  path: z.ZodOptional<z.ZodString>;
};

/** Reference to another board, resolved by ID, path, or URL. */
export const OBFLoadBoardSchema = obfObject<OBFLoadBoardShape>({
  id: OBFOptionalIDSchema,
  name: z.string().optional(),
  data_url: OBFOptionalUrlSchema,
  url: OBFOptionalUrlSchema,
  path: z.string().optional(),
});

/** Reference to another board, resolved by ID, path, or URL. See {@link OBFLoadBoardSchema}. */
export interface OBFLoadBoard extends z.infer<typeof OBFLoadBoardSchema> {}

/** Fields of {@link OBFButtonSchema}. */
type OBFButtonShape = {
  /** Unique identifier for the button. A non-empty string, or a number converted to a string. */
  id: typeof OBFIDSchema;
  /** Label text displayed on the button. */
  label: z.ZodOptional<z.ZodString>;
  /** Alternative text for vocalization when the button is activated. */
  vocalization: z.ZodOptional<z.ZodString>;
  /**
   * Identifier of the image associated with the button. A string, or a
   * number converted to a string; an empty string parses to `undefined`.
   */
  image_id: typeof OBFOptionalIDSchema;
  /**
   * Identifier of the sound associated with the button. A string, or a
   * number converted to a string; an empty string parses to `undefined`.
   */
  sound_id: typeof OBFOptionalIDSchema;
  /**
   * Action triggered by the button. When `actions` is also set, this is
   * the single-action fallback for apps that support one action per button.
   */
  action: z.ZodOptional<typeof OBFButtonActionSchema>;
  /**
   * Multiple actions executed in order. Apps that support it should
   * prefer this over the single `action` fallback.
   */
  actions: z.ZodOptional<z.ZodArray<typeof OBFButtonActionSchema>>;
  /** Information to load another board when this button is activated. */
  load_board: z.ZodOptional<typeof OBFLoadBoardSchema>;
  /**
   * Background color, typically an `rgb()` or `rgba()` value. Accepts any
   * string.
   */
  background_color: z.ZodOptional<z.ZodString>;
  /**
   * Border color, typically an `rgb()` or `rgba()` value. Accepts any string.
   */
  border_color: z.ZodOptional<z.ZodString>;
  /**
   * Vertical position for absolute positioning, from 0 to 1. Set all of
   * `top`, `left`, `width`, and `height`, or none.
   */
  top: z.ZodOptional<z.ZodNumber>;
  /**
   * Horizontal position for absolute positioning, from 0 to 1. Set all of
   * `top`, `left`, `width`, and `height`, or none.
   */
  left: z.ZodOptional<z.ZodNumber>;
  /**
   * Width of the button for absolute positioning, from 0 to 1. Set all of
   * `top`, `left`, `width`, and `height`, or none.
   */
  width: z.ZodOptional<z.ZodNumber>;
  /**
   * Height of the button for absolute positioning, from 0 to 1. Set all of
   * `top`, `left`, `width`, and `height`, or none.
   */
  height: z.ZodOptional<z.ZodNumber>;
};

/**
 * Interactive board element, optionally linked to images, sounds, and actions.
 */
export const OBFButtonSchema = obfObject<OBFButtonShape>({
  id: OBFIDSchema,
  label: z.string().optional(),
  vocalization: z.string().optional(),
  image_id: OBFOptionalIDSchema,
  sound_id: OBFOptionalIDSchema,
  action: OBFButtonActionSchema.optional(),
  actions: z.array(OBFButtonActionSchema).optional(),
  load_board: OBFLoadBoardSchema.optional(),
  background_color: z.string().optional(),
  border_color: z.string().optional(),
  top: z.number().min(0).max(1).optional(),
  left: z.number().min(0).max(1).optional(),
  width: z.number().min(0).max(1).optional(),
  height: z.number().min(0).max(1).optional(),
}).refine(
  (b) => {
    const set = [b.top, b.left, b.width, b.height].filter(
      (v) => v !== undefined,
    );
    return set.length === 0 || set.length === 4;
  },
  {
    message:
      "Absolute positioning requires all of top, left, width, and height (or none)",
  },
);

/** Interactive board element, optionally linked to images, sounds, and actions. See {@link OBFButtonSchema}. */
export interface OBFButton extends z.infer<typeof OBFButtonSchema> {}

/**
 * Upper bound on grid dimensions. A board only needs these to lay out cells;
 * a consumer allocates rows × columns, so an unbounded value (e.g. 1e9) would
 * exhaust memory. 100 is generous headroom over any real AAC board (~15–20)
 * and caps the hostile worst case at 100 × 100 cells.
 */
const MAX_GRID_ROWS = 100;
const MAX_GRID_COLUMNS = 100;

/** Fields of {@link OBFGridSchema}. */
type OBFGridShape = {
  /** Number of rows in the grid: an integer from 1 to 100. Must equal the length of `order`. */
  rows: z.ZodNumber;
  /** Number of columns in the grid: an integer from 1 to 100. Must equal the length of every row in `order`. */
  columns: z.ZodNumber;
  /**
   * Button IDs by row; `null` marks an empty cell. Holds `rows` rows of
   * `columns` cells each. Numeric IDs are converted to strings.
   */
  order: z.ZodArray<
    z.ZodArray<z.ZodUnion<readonly [typeof OBFIDSchema, z.ZodNull]>>
  >;
};

/** Row-and-column layout that arranges buttons by their IDs. */
export const OBFGridSchema = obfObject<OBFGridShape>({
  rows: z.number().int().min(1).max(MAX_GRID_ROWS),
  columns: z.number().int().min(1).max(MAX_GRID_COLUMNS),
  order: z.array(z.array(z.union([OBFIDSchema, z.null()]))),
})
  .refine((g) => g.order.length === g.rows, {
    message: "Grid order length must match rows",
  })
  .refine((g) => g.order.every((row) => row.length === g.columns), {
    message: "Each grid row must have length equal to columns",
  });

/** Row-and-column layout that arranges buttons by their IDs. See {@link OBFGridSchema}. */
export interface OBFGrid extends z.infer<typeof OBFGridSchema> {}

/** Fields of {@link OBFBoardSchema}. */
type OBFBoardShape = {
  /** Format version of the Open Board Format, e.g., `open-board-0.1`. Must start with `open-board-`. */
  format: typeof OBFFormatVersionSchema;
  /** Unique identifier for the board. A non-empty string, or a number converted to a string. */
  id: typeof OBFIDSchema;
  /** Locale identifier, typically a BCP 47 language tag such as `en` or `en-US`. Accepts any string. */
  locale: z.ZodOptional<typeof OBFLocaleCodeSchema>;
  /** List of buttons on the board. */
  buttons: z.ZodArray<typeof OBFButtonSchema>;
  /** URL where the board can be accessed or downloaded. Must be a valid URL; an empty string parses to `undefined`. */
  url: typeof OBFOptionalUrlSchema;
  /** Name of the board. */
  name: z.ZodOptional<z.ZodString>;
  /** Description of the board in HTML format. */
  description_html: z.ZodOptional<z.ZodString>;
  /** Grid layout information for arranging buttons. */
  grid: typeof OBFGridSchema;
  /** List of images used in the board. */
  images: z.ZodOptional<z.ZodArray<typeof OBFImageSchema>>;
  /** List of sounds used in the board. */
  sounds: z.ZodOptional<z.ZodArray<typeof OBFSoundSchema>>;
  /** Licensing information for the board. */
  license: z.ZodOptional<typeof OBFLicenseSchema>;
  /** String translations for multiple locales. */
  strings: z.ZodOptional<typeof OBFStringsSchema>;
};

/**
 * Root object of an `.obf` file: the complete definition of a single communication board.
 */
export const OBFBoardSchema = obfObject<OBFBoardShape>({
  format: OBFFormatVersionSchema,
  id: OBFIDSchema,
  locale: OBFLocaleCodeSchema.optional(),
  buttons: z.array(OBFButtonSchema),
  url: OBFOptionalUrlSchema,
  name: z.string().optional(),
  description_html: z.string().optional(),
  grid: OBFGridSchema,
  images: z.array(OBFImageSchema).optional(),
  sounds: z.array(OBFSoundSchema).optional(),
  license: OBFLicenseSchema.optional(),
  strings: OBFStringsSchema.optional(),
});

/** Root object of an `.obf` file: the complete definition of a single communication board. See {@link OBFBoardSchema}. */
export interface OBFBoard extends z.infer<typeof OBFBoardSchema> {}

/** Fields of the manifest's `paths` object. */
type OBFManifestPathsShape = {
  /** Mapping of board IDs to their file paths. */
  boards: z.ZodRecord<z.ZodString, z.ZodString>;
  /** Mapping of image IDs to their file paths. */
  images: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
  /** Mapping of sound IDs to their file paths. */
  sounds: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
};

/** Fields of {@link OBFManifestSchema}. */
type OBFManifestShape = {
  /** Format version of the Open Board Format, e.g., `open-board-0.1`. Must start with `open-board-`. */
  format: typeof OBFFormatVersionSchema;
  /** Path to the root board within the `.obz` package. Must be one of the paths in `paths.boards`. */
  root: z.ZodString;
  /** Mapping of IDs to paths for boards, images, and sounds. */
  paths: z.ZodObject<OBFManifestPathsShape, z.core.$loose>;
};

/**
 * Table of contents for an `.obz` package, mapping resource IDs to their archive paths.
 */
export const OBFManifestSchema = obfObject<OBFManifestShape>({
  format: OBFFormatVersionSchema,
  root: z.string(),
  paths: obfObject<OBFManifestPathsShape>({
    boards: z.record(z.string(), z.string()),
    images: z.record(z.string(), z.string()).optional(),
    sounds: z.record(z.string(), z.string()).optional(),
  }),
}).refine((m) => Object.values(m.paths.boards).includes(m.root), {
  message: "root must be listed in paths.boards",
  path: ["root"],
});

/** Table of contents for an `.obz` package, mapping resource IDs to their archive paths. See {@link OBFManifestSchema}. */
export interface OBFManifest extends z.infer<typeof OBFManifestSchema> {}
