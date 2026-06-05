---
"@shayc/open-board-format": minor
---

Add `loadBoard(file)`, a format-detecting entry point. It reads the file once, sniffs the ZIP magic prefix, and returns a discriminated union — `{ format: "obz", archive } | { format: "obf", board }`. Consumers can now accept either an `.obf` board or an `.obz` package from a single file input without inspecting the extension or re-deriving the OBF-vs-OBZ distinction themselves. Also exports the accompanying `LoadedBoard` type.
