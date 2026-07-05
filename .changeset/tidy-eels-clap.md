---
"@shayc/open-board-format": patch
---

`createOBZ` now always emits both `paths.images` and `paths.sounds` in the generated manifest, even when empty, matching the spec's example manifest instead of omitting `sounds` when there are none.
