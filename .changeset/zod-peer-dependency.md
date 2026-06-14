---
"@shayc/open-board-format": minor
---

**Breaking:** `zod` is now a peer dependency instead of a bundled dependency. Install it alongside this package:

```bash
npm install zod@^4
```

npm 7+ installs the peer automatically; pnpm and Yarn users must add `zod` explicitly. This makes your app and this package share a single `zod` instance, so the exported schemas (`OBFBoardSchema`, `OBFButtonSchema`, …) and the `OBFIssue` type compose against your own `zod` without duplicate-copy type mismatches.
