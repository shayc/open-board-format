---
"@shayc/open-board-format": patch
---

docs: polish public API JSDoc for better IntelliSense

- Document every exported type alias (`OBFBoard`, `OBFButton`, …) so hover tooltips show a description instead of just the expanded type
- Move `ParsedOBZ` field docs from `@property` tags onto the fields themselves so they surface in editors
- Clarify `data_url` as an API endpoint (not a `data:` URI) and note it is outside the `data` → `path` → `url` fallback chain
- Document `action` vs `actions` precedence per the OBF spec
- Correct fflate compression-level scale (0–9), standardize `@throws` phrasing, example quoting, and module headers; tag `buildJsonParseErrorMessage` as `@internal`
