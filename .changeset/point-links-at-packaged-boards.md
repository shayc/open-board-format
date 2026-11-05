---
"@shayc/open-board-format": minor
---

`createOBZ` now sets `load_board.path` on every link whose `id` names one of the supplied boards, pointing it at the file it writes for that board (`boards/<encoded-id>.obf`). Before, a path copied from a source archive kept pointing at the old file name, so every link in a repackaged board set (all 77 in Quick Core 112) referred to a file that no longer existed, and readers that follow `path` first, such as CoughDrop's, could not navigate the package. Links without an `id`, and links to boards outside the package, are left unchanged, and the boards you pass in are not modified.
