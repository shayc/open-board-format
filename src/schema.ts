/**
 * Zod schemas for the Open Board Format (OBF) data model.
 */

import { z } from "zod";

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

/** Optional ID: numbers are coerced to strings, empty strings to undefined. */
const OBFOptionalIDSchema = z
  .union([z.string(), z.number()])
  .transform((val) => {
    const str = String(val);
    return str === "" ? undefined : str;
  })
  .optional();

/**
 * Identifier for a board, button, or media item, coerced to a non-empty
 * string. The spec requires uniqueness per file; this schema does not check it.
 */
export const OBFIDSchema = z
  .union([z.string(), z.number()])
  .transform((val) => String(val))
  .pipe(z.string().min(1));

/** Identifier for a board, button, or media item, coerced to a non-empty string. See {@link OBFIDSchema}. */
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

/** License terms and attribution for a resource. */
export const OBFLicenseSchema = z.looseObject({
  /** Type of the license, e.g., `CC-BY-SA`. */
  type: z.string(),
  /** URL to the license terms. */
  copyright_notice_url: OBFOptionalUrlSchema,
  source_url: OBFOptionalUrlSchema,
  author_name: z.string().optional(),
  author_url: OBFOptionalUrlSchema,
  author_email: OBFOptionalEmailSchema,
});

/** License terms and attribution for a resource. See {@link OBFLicenseSchema}. */
export type OBFLicense = z.infer<typeof OBFLicenseSchema>;

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
export const OBFMediaSchema = z.looseObject({
  id: OBFIDSchema,
  /** Media data inlined as a `data:` URI. */
  data: z.string().optional(),
  /** Path to the media file within an `.obz` package. */
  path: z.string().optional(),
  /**
   * URL of an API endpoint that returns information about the media —
   * not a `data:` URI (that is `data`).
   */
  data_url: OBFOptionalUrlSchema,
  url: OBFOptionalUrlSchema,
  /** MIME type of the media, e.g., `image/png`, `audio/mpeg`. */
  content_type: z.string().optional(),
  license: OBFLicenseSchema.optional(),
});

/** Common properties for media resources (images and sounds). See {@link OBFMediaSchema}. */
export type OBFMedia = z.infer<typeof OBFMediaSchema>;

/** Reference to a symbol in a proprietary symbol set (e.g., SymbolStix). */
export const OBFSymbolInfoSchema = z.looseObject({
  /** Name of the symbol set, e.g., `symbolstix`. */
  set: z.string(),
  filename: z.string(),
});

/** Reference to a symbol in a proprietary symbol set. See {@link OBFSymbolInfoSchema}. */
export type OBFSymbolInfo = z.infer<typeof OBFSymbolInfoSchema>;

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
export const OBFImageSchema = OBFMediaSchema.extend({
  symbol: OBFSymbolInfoSchema.optional(),
  /** Width of the image in pixels. */
  width: z.number().optional(),
  /** Height of the image in pixels. */
  height: z.number().optional(),
});

/** Image resource with optional symbol and dimension properties. See {@link OBFImageSchema}. */
export type OBFImage = z.infer<typeof OBFImageSchema>;

/**
 * Audio resource. Identical to {@link OBFMediaSchema} — no additional properties.
 */
export const OBFSoundSchema = OBFMediaSchema;

/** Audio resource, identical to {@link OBFMediaSchema}. See {@link OBFSoundSchema}. */
export type OBFSound = z.infer<typeof OBFSoundSchema>;

/** Reference to another board, resolved by ID, path, or URL. */
export const OBFLoadBoardSchema = z.looseObject({
  id: OBFOptionalIDSchema,
  name: z.string().optional(),
  /**
   * URL of an API endpoint for fetching the board programmatically —
   * not a `data:` URI.
   */
  data_url: OBFOptionalUrlSchema,
  /** URL to access the board via a web browser. */
  url: OBFOptionalUrlSchema,
  /** Path to the board within an `.obz` package. */
  path: z.string().optional(),
});

/** Reference to another board, resolved by ID, path, or URL. See {@link OBFLoadBoardSchema}. */
export type OBFLoadBoard = z.infer<typeof OBFLoadBoardSchema>;

/**
 * Interactive board element, optionally linked to images, sounds, and actions.
 */
export const OBFButtonSchema = z
  .looseObject({
    id: OBFIDSchema,
    label: z.string().optional(),
    /** Alternative text for vocalization when the button is activated. */
    vocalization: z.string().optional(),
    image_id: OBFOptionalIDSchema,
    sound_id: OBFOptionalIDSchema,
    /**
     * Action triggered by the button. When `actions` is also set, this is
     * the single-action fallback for apps that support one action per button.
     */
    action: OBFButtonActionSchema.optional(),
    /**
     * Multiple actions executed in order. Apps that support it should
     * prefer this over the single `action` fallback.
     */
    actions: z.array(OBFButtonActionSchema).optional(),
    load_board: OBFLoadBoardSchema.optional(),
    /**
     * Background color, typically an `rgb()` or `rgba()` value. Accepts any
     * string.
     */
    background_color: z.string().optional(),
    /**
     * Border color, typically an `rgb()` or `rgba()` value. Accepts any string.
     */
    border_color: z.string().optional(),
    /** Vertical position for absolute positioning, from 0 to 1. */
    top: z.number().min(0).max(1).optional(),
    /** Horizontal position for absolute positioning, from 0 to 1. */
    left: z.number().min(0).max(1).optional(),
    /** Width of the button for absolute positioning, from 0 to 1. */
    width: z.number().min(0).max(1).optional(),
    /** Height of the button for absolute positioning, from 0 to 1. */
    height: z.number().min(0).max(1).optional(),
  })
  .refine(
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
export type OBFButton = z.infer<typeof OBFButtonSchema>;

// Upper bounds on grid dimensions. A consumer allocates rows × columns cells,
// so an unbounded value (e.g. 1e9) would exhaust memory. 100 is generous
// headroom over any real AAC board (~15–20) and caps the hostile worst case at
// 100 × 100 cells.
const MAX_GRID_ROWS = 100;
const MAX_GRID_COLUMNS = 100;

/** Row-and-column layout that arranges buttons by their IDs. */
export const OBFGridSchema = z
  .looseObject({
    rows: z.number().int().min(1).max(MAX_GRID_ROWS),
    columns: z.number().int().min(1).max(MAX_GRID_COLUMNS),
    /** Button IDs by row; `null` marks an empty cell. */
    order: z.array(z.array(z.union([OBFIDSchema, z.null()]))),
  })
  .refine((g) => g.order.length === g.rows, {
    message: "Grid order length must match rows",
  })
  .refine((g) => g.order.every((row) => row.length === g.columns), {
    message: "Each grid row must have length equal to columns",
  });

/** Row-and-column layout that arranges buttons by their IDs. See {@link OBFGridSchema}. */
export type OBFGrid = z.infer<typeof OBFGridSchema>;

/**
 * Root object of an `.obf` file: the complete definition of a single communication board.
 *
 * Specification: https://www.openboardformat.org/docs
 */
export const OBFBoardSchema = z.looseObject({
  format: OBFFormatVersionSchema,
  id: OBFIDSchema,
  locale: OBFLocaleCodeSchema.optional(),
  buttons: z.array(OBFButtonSchema),
  /** URL where the board can be accessed or downloaded. */
  url: OBFOptionalUrlSchema,
  name: z.string().optional(),
  /** Description of the board in HTML format. */
  description_html: z.string().optional(),
  grid: OBFGridSchema,
  images: z.array(OBFImageSchema).optional(),
  sounds: z.array(OBFSoundSchema).optional(),
  license: OBFLicenseSchema.optional(),
  strings: OBFStringsSchema.optional(),
});

/** Root object of an `.obf` file: the complete definition of a single communication board. See {@link OBFBoardSchema}. */
export type OBFBoard = z.infer<typeof OBFBoardSchema>;

/**
 * Table of contents for an `.obz` package, mapping resource IDs to their archive paths.
 */
export const OBFManifestSchema = z
  .looseObject({
    format: OBFFormatVersionSchema,
    /** Path to the root board within the `.obz` package. */
    root: z.string(),
    paths: z.looseObject({
      boards: z.record(z.string(), z.string()),
      images: z.record(z.string(), z.string()).optional(),
      sounds: z.record(z.string(), z.string()).optional(),
    }),
  })
  .refine((m) => Object.values(m.paths.boards).includes(m.root), {
    message: "root must be listed in paths.boards",
    path: ["root"],
  });

/** Table of contents for an `.obz` package, mapping resource IDs to their archive paths. See {@link OBFManifestSchema}. */
export type OBFManifest = z.infer<typeof OBFManifestSchema>;
