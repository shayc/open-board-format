---
"@shayc/open-board-format": patch
---

Prefix the OBZ missing-board extraction error with `Invalid OBZ:` so it matches the convention used by every other OBZ failure, letting consumers reliably detect malformed packages by message prefix.
