# thesarvo-3

Climbing guide site for thesarvo.com: TanStack Start, React 19, Tailwind 4, Vite, Vitest.
Plans live in [`docs/`](docs/); what is deployed is in [`docs/as-built.md`](docs/as-built.md), and the working rules in [`AGENTS.md`](AGENTS.md).

## Commands

```bash
npm run dev         # dev server on :47213
npm test            # vitest
npm run typecheck   # tsc 7
npm run lint        # eslint (needs TS 6, installed as `typescript`)
npm run build       # production build
```

Static HTML for chosen pages: `PRERENDER_PATHS="/g,/g/south-east/lowdina" npm run build`.
Every other guide renders on demand from the index.

## Content

Guides are read through a `ContentSource` (`src/guide/content`). The dev default is the
downloaded data folder; override with `CONTENT_DIR=/path/to/data`. In dev, images are
served by a Vite middleware at `/g/content?f=<file>`.

## Layout

- `src/components` app shell (header, expandable sidebar, footer)
- `src/guide/model` types and path geometry
- `src/guide/convert` XML <-> model (round-trips the fixtures)
- `src/guide/view` read view (topo overlay, climbs, GPS)
- `src/guide/islands` lazy Leaflet map
- `src/guide/edit` editor: reducer with undo/redo, topo operations, local drafts

- `src/auth` Cognito sign-in in the browser, token checks on the server, the Confluence user migration
- `src/aws` S3 signing (presigned uploads, listing)
- `src/routes/g.api.*` the Lambda's API routes

Editor edits are saved as drafts in localStorage; saving to the content repo is not built yet
(`docs/plan-backend.md` B2). Photo uploads go to S3.

## Tooling note

`typescript` is pinned to 6 because typescript-eslint cannot use the TS 7 native compiler.
`typecheck` runs TS 7 through the `typescript-7` alias.
