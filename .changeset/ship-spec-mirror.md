---
"@shayc/open-board-format": patch
---

docs: ship the OBF spec mirror (`docs/external/open-board-format.md`) in the npm package

The README already points at this file; including it makes that link resolve
inside `node_modules` and gives offline tooling and coding agents the full
format semantics (specialty actions, string-list fallback, ID uniqueness)
that type declarations can't carry.
