---
"@shayc/open-board-format": patch
---

Lower the `engines.node` floor from `>=24` to `>=22` so the library installs cleanly on both live LTS lines (Node 22 maintenance and 24 active). The shipped code only uses APIs available since Node 20, so the previous `>=24` requirement excluded Node 22 consumers for no technical reason.
