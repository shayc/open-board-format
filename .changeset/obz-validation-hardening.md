---
"@shayc/open-board-format": patch
---

Harden OBZ validation:

- `createOBZ` now throws on duplicate board ids instead of silently keeping only the last board with a given id.
- Manifest validation (`OBFManifestSchema`, `parseManifest`, `extractOBZ`) now rejects manifests whose `root` is not listed in `paths.boards`, instead of extracting an archive whose root board can't be resolved.
