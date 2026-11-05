---
"@shayc/open-board-format": patch
---

Fix `extractOBZ`, `loadBoard`, `loadOBZ`, `unzip`, `createOBZ`, and `zip` never settling in browsers whose Content Security Policy does not allow `blob:` workers (for example `default-src 'self'`). fflate's asynchronous API moved large entries (160 KB or more to compress, 512 KB or more to decompress) into `blob:` Workers, which such a policy blocks without an error. ZIP work now uses fflate's synchronous API on the calling thread. On real board sets this is as fast or faster, but a package made mostly of large, highly compressible boards can take up to about twice as long to create. Call the package from your own Worker to keep a page responsive.
