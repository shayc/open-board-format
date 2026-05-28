# @shayc/open-board-format

## 0.1.2

### Patch Changes

- 3511f0f: Lower the `engines.node` floor from `>=24` to `>=22` so the library installs cleanly on both live LTS lines (Node 22 maintenance and 24 active). The shipped code only uses APIs available since Node 20, so the previous `>=24` requirement excluded Node 22 consumers for no technical reason.

## 0.1.1

### Patch Changes

- d8a0c9f: Set up release tooling: Prettier, ESLint, Changesets, publint, CI and release workflows.
