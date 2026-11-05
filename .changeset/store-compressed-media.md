---
"@shayc/open-board-format": patch
---

`createOBZ` now stores resources in already-compressed formats (PNG, JPEG, GIF, WebP, AVIF, MP3, AAC, Ogg, Opus, MP4, WebM, chosen by file extension) without recompressing them, and still deflates everything else, including SVG, WAV, boards, and the manifest. On a real 70 MB board set this makes packaging about 3× faster for an archive about 2% larger. The `zip` utility is unchanged and still deflates every entry.
