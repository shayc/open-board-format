---
"@shayc/open-board-format": patch
---

Percent-encode board ids into OBZ archive paths, preventing a crafted board id (e.g. containing `../` or `/`) from writing outside the `boards/` directory.
