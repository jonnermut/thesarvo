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
npm run package-publisher  # dist/publisher.tgz: the app prebuilt for the publish Action (CI does this on push)
npm run sync-access        # access.json in the content repo, from Confluence's view restrictions (read-only)
npm run import-members -- --from-confluence   # group members into private/groups.json; dry run unless --apply
npm run import-avatars                        # Confluence profile pictures into avatars/ and avatars.json (128 px); dry run unless --apply
npm run import-history                        # Confluence's version history of each guide into pages/<id>/history.json; dry run unless --apply
```

Static HTML for chosen pages: `PRERENDER_PATHS="/g,/g/south-east/lowdina" npm run build`.
Every other guide renders on demand from the index.

## Content

Guides are read through a `ContentSource` (`src/guide/content`). The dev default is the
downloaded data folder; override with `CONTENT_DIR=/path/to/data`. In dev, images are
served by a Vite middleware at `/g/content?f=<file>`.

Private pages: `access.json` in the content repo says who may read which page (`src/guide/content/access.ts`). The
public build and every public source leave them out; the Lambda's private API serves them to signed-in people with
access. Groups are roles (`admins` is the admin role); who is in a group is `private/groups.json` in the bucket.

## Layout

- `src/components` app shell (header, expandable sidebar, footer)
- `src/guide/model` types and path geometry
- `src/guide/convert` XML <-> model (round-trips the fixtures)
- `src/guide/view` read view (topo overlay, climbs, GPS)
- `src/guide/islands` lazy Leaflet map
- `src/guide/edit` editor: reducer with undo/redo, topo operations, local drafts, the saver
- `src/guide/save` saving on the server: per-node merge, edit-session history, validation, the GitHub and local repos
- `src/guide/history` the history page (`?history`): word and field diffs, revert and restore worked out from `history.json`

- `src/auth` Cognito sign-in in the browser, token checks on the server, the Confluence user migration
- `src/aws` S3 signing (presigned uploads, listing)
- `src/routes/g.api.*` the Lambda's API routes

Editor edits save by themselves through `POST /g/api/save` (`docs/plan-backend.md` B2), with a draft in
localStorage until each save succeeds. The dev server saves to `.saves/` (gitignored; `SAVES_DIR` overrides) and
reads guides from there first; delete it to start again. Elsewhere saving commits to GitHub when `CONTENT_REPO`
(`owner/name`, optional `CONTENT_BRANCH`) and `GITHUB_TOKEN` or `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID` and
`GITHUB_APP_PRIVATE_KEY` are set; without them the API answers 501 and the editor keeps drafts only. Photo uploads
go to S3.

## Tooling note

`typescript` is pinned to 6 because typescript-eslint cannot use the TS 7 native compiler.
`typecheck` runs TS 7 through the `typescript-7` alias.
