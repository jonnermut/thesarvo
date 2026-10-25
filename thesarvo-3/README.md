# thesarvo-3

Climbing guide site for thesarvo.com: TanStack Start, React 19, Tailwind 4, Vite, Vitest.
Plans live in [`docs/`](docs/).

## Commands

```bash
npm run dev         # dev server on :47213
npm test            # vitest
npm run typecheck   # tsc 7
npx eslint src      # lint (needs TS 6, installed as `typescript`)
npm run build       # production build
```

Static HTML for chosen pages: `PRERENDER_PATHS="/,/g/south-east/lowdina" npm run build`.
Every other guide renders on demand from the index.

## Content

Guides are read through a `ContentSource` (`src/guide/content`). The dev default is the
downloaded data folder; override with `CONTENT_DIR=/path/to/data`. In dev, images are
served by a Vite middleware at `/content?f=<file>`.

## Layout

- `src/components` app shell (header, expandable sidebar, footer)
- `src/guide/model` types and path geometry
- `src/guide/convert` XML <-> model (round-trips the fixtures)
- `src/guide/view` read view (topo overlay, climbs, GPS)
- `src/guide/islands` lazy Leaflet map
- `src/guide/edit` editor: reducer with undo/redo, topo operations, local drafts

Editor edits are saved as drafts in localStorage and can be downloaded as XML; there is no
backend yet (see `docs/plan-backend.md`).

## Tooling note

`typescript` is pinned to 6 because typescript-eslint cannot use the TS 7 native compiler.
`typecheck` runs TS 7 through the `typescript-7` alias.
