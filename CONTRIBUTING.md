# Contributing

Thanks for your interest in contributing to `@shayc/open-board-format`.

## Development

Requires Node 24+.

```bash
npm install
```

Common commands:

```bash
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm test            # vitest run
npm run build       # tsdown → dist/
```

## Pull requests

Any user-facing change (new feature, bug fix, breaking change, dependency bump that affects consumers) must include a changeset:

```bash
npx changeset
```

Choose patch / minor / major and write a short summary. The changeset bot will turn this into a "Version Packages" PR on merge, and merging that PR triggers the publish.

Pure refactors, docs-only changes, and CI tweaks don't need a changeset.

## Reporting issues

Open an issue at [github.com/shayc/open-board-format/issues](https://github.com/shayc/open-board-format/issues). Include the OBF/OBZ file (or a minimal reproduction), the version of `@shayc/open-board-format` you're using, and the runtime (Node version, browser, bundler).
