# thesarvo-3: notes for agents

The new thesarvo.com: Tasmanian climbing guides moving off Confluence to a TanStack Start app (React 19,
Tailwind 4, TypeScript, Vite, Vitest), served as a static site on S3 and CloudFront, with a small Lambda API and
Cognito sign-in. The owner is Jon. The content lives in a separate repo, `../../thesarvo-content`.

## The inviolate rule: the public site is static

**Nothing a public (signed-out) visitor does may run the Lambda.** Public pages, guides, images, data, feeds and the home page are
static files in S3 served by CloudFront, and a page view costs nothing but CloudFront. The Lambda (`/g/api/*`, `/g/upload`, `/_serverFn/*`)
is only for signed-in actions: saving, uploading, the forum, private pages. Do not add a public `GET` API route that a page calls; if public
data changes at run time, the Lambda writes it as a static file when it changes (see `publishFeeds` for the forum's home feeds), and the
page reads the file. Before adding a `fetch` to a page, ask: does this run the Lambda for someone who is not signed in? If yes, redesign it.
The owner treats this as non-negotiable (8 Nov 2026, after the forum home feeds were found running the Lambda on every home view).

## Read first

The docs live in the **private** repo `thesarvo-private`, checked out as a peer of this one (`../../thesarvo-private` from here; clone it with `gh repo clone jonnermut/thesarvo-private` if missing). This repo is public: no docs, account details, addresses or other private information go in it.

- [docs/as-built.md](../../thesarvo-private/docs/as-built.md): what is deployed, the AWS inventory, how to operate it, and what is new
  compared with the live site. Start here.
- [docs/thesarvo-3-masterplan.md](../../thesarvo-private/docs/thesarvo-3-masterplan.md): why and the phases.
- [docs/plan-guide.md](../../thesarvo-private/docs/plan-guide.md) (guide view and editor), [docs/plan-navigation.md](../../thesarvo-private/docs/plan-navigation.md)
  (navigation, search, contents pages) and [docs/plan-backend.md](../../thesarvo-private/docs/plan-backend.md) (storage, auth, save,
  publish, legacy app endpoints).
- [docs/plan-mvp.md](../../thesarvo-private/docs/plan-mvp.md): everything still needed before cutover (history, restricted pages, extra pages,
  forum, apps, avatars, add a page) and the cutover plan.
- [docs/lambda-backend.md](../../thesarvo-private/docs/lambda-backend.md) (the Lambda, timings, costs),
  [docs/auth-comparison.md](../../thesarvo-private/docs/auth-comparison.md), [docs/live-site-differences.md](../../thesarvo-private/docs/live-site-differences.md),
  [docs/todo.md](../../thesarvo-private/docs/todo.md), [aws-agent-rights.md](../../thesarvo-private/docs/aws-agent-rights.md) (the agent's AWS rights).
- [README.md](README.md): commands and source layout.

## Rules

- **The live site is read-only.** Never save, edit or delete anything on thesarvo.com or its Confluence. Database
  access is read-only `SELECT`s only. Ask before reading anything on the server that the scripts do not already
  read.
- **Secrets stay out of git and out of output.** Password-hash exports are written outside the repo and deleted
  after use; never print hash values, tokens or the origin secret.
- **No real passwords.** Never type the owner's or any user's password. To test sign-in, admin-create a throwaway
  Cognito user, get tokens with `initiate-auth`, and delete the user afterwards. Never use the managed login page
  with test credentials.
- **AWS as the agent:** the `claude-agent-thesarvo` profile (the scripts' default), never `grayplanning`. Its rights are
  in [aws-agent-rights.md](../../thesarvo-private/docs/aws-agent-rights.md); ask the owner when it lacks one rather than switching profile.
- **Content changes publish themselves.** Every push to `main` of `../../thesarvo-content` runs the Publish Action (about 15 s to live, with the latest `publisher` package), so editing files there directly publishes them like a save. The Action uses minutes from a 2,000 a month allowance; do not push content in bursts. See plan-backend B3.
- **A push to `master` deploys the app.** The `publisher` workflow builds the package and releases it, which starts a full publish of the content repo (live in about 20 s). Work on a branch and merge to `master` only when it should go live; branch pushes deploy nothing. Check `typecheck`, `lint`, `test` and the build first.
- **The content index is locked** (`sync.json` `indexLocked`): `sync-content` reports Confluence index changes and never rewrites `index.json`; edit it by hand. Page access of local pages (ids from 9,000,000,000) is kept by `sync-access`.
- **Never deploy the site from a stale content checkout.** Every save through the site is committed straight to GitHub, so `../../thesarvo-content` falls behind within hours (it was once 1150 commits behind). `build-site` and `deploy-site.sh` use whatever is on disk: deploying an old checkout puts old pages live and wipes recent edits. Before any `build-site` that will be deployed, `git -C ../../thesarvo-content pull --ff-only` and check `git status`; `deploy-site.sh` refuses when the checkout is behind `origin/main` or has local edits. Content normally publishes itself through the Action, so only deploy the site by hand for an app change, and say so first.
- **Never push** unless asked. Commit on the current branch.
- Keep `PublicRead` and website hosting on the bucket until the owner says the beta tester has moved to the
  https address.

## Code

- Concise, type-safe TypeScript. No `any`, no casts that hide a real type problem, no dependency where a few lines
  do (S3 signing is hand-written; validation is hand-written, no zod).
- Match the surrounding code: its naming, comment density and formatting (long lines, as in the files around it).
- Tests with every change (Vitest, beside the code as `*.test.ts`). Tests that need the content repo skip
  themselves when it is not checked out.
- API routes must never answer 404: CloudFront turns every 404 into the guide home page. Use 400 for bad input.
- **Private pages:** anything that reads content for the public (build, static source, `getContentSource`) goes through `publicSource` (`src/guide/content/access.ts`); `getFullContent()` is only for code that has checked `canRead` first (`src/auth/pageGuard.ts`). Run `src/guide/content/leak.test.ts` after touching a source or the build. Never put group members or private photos under a public bucket prefix; `private/` is not public.
- **The forum is members-only:** its threads live in the bucket's `private/forum/` (never public) and are served only by `/g/api/forum` after sign-in; only `forum-recent` (titles and counts) is public. Never put forum text in `g-data/` or the site build, and keep `forum/` in the content repo out of the build. CCT threads carry `group: cct-members`.
- **Public pages never run the Lambda.** Anything a public page shows comes from static files in the bucket through CloudFront. The Lambda sits behind `/g/api/*` for signed-in actions only; a public feed that changes (the forum's home feeds) is written as a static file by the Lambda when it changes (`publishFeeds`), never fetched from an API route. Do not add a public `GET` API route for a page to call.
- **theCrag material is marked:** copyright material taken from theCrag (CC BY-NC-SA; the site is CC BY-SA) carries `other.thecragContent` and is credited on the page (`src/guide/view/credit.tsx`). Anything that copies descriptions or topos from theCrag must set the mark, and publisher topos are never copied. See the private plan-thecrag-sync.md.
- Readers must never download the editor: `npm run check-bundle` guards it (the guide editor and the rich text editor, `src/rte`).
- **Guide HTML is sanitised on save too:** header `rich` fields, `notices` and text blocks of cls `rich`/`note`/`warning` go through `cleanNode` (`src/guide/save/cleanRich.ts`, guide profile of `sanitizeHtml`); new rich fields are added to `RICH_FIELDS`, `validate.ts` and `cleanRich.ts`, with a test.
- **Rich text is sanitised on the server.** Every save of prose page, forum post or comment HTML goes through `sanitizeHtml` (`src/rte/sanitize.ts`); never store or render what the browser sent as it is. New tags, attributes or embed hosts are added there (and to `extensions.ts`), with a test.

## Before every commit

1. **Docs.** Update every doc the change affects (in `thesarvo-private`, committed there alongside this commit): [docs/as-built.md](../../thesarvo-private/docs/as-built.md) for
   anything deployed, any infrastructure or script, and new user-visible features (its "New compared with the
   live site" list); the matching plan doc (mark items done, record decisions); `thesarvo-private/docs/todo.md`; the README for
   new commands or layout; this file for new rules.
2. **Typecheck:** `npm run typecheck` (TS 7).
3. **Lint:** `npm run lint` (eslint; needs TS 6, installed as `typescript`).
4. **Tests:** `npm test`, all passing.
5. **Build** when the change touches build or bundling: `npm run build` and `npm run check-bundle`.
6. Commit with a message that says what changed and why, ending with the `Co-Authored-By:` trailer for the model
   that wrote it.

CI (`.github/workflows/thesarvo-3.yml`) runs typecheck, lint, tests, build and check-bundle on pushes to master and on PRs.

## After a change to the site

- Pull the content repo first (`git -C ../../thesarvo-content pull --ff-only`), then rebuild and redeploy the static site: `npm run build-site -- --dir ../../thesarvo-content`, then
  `../../thesarvo-private/scripts/deploy-site.sh`, then invalidate CloudFront (`E1UB3F13YZEV4`). Redeploy the Lambda
  (`../../thesarvo-private/scripts/deploy-lambda.sh`) when server code changes; a push to `master` does not do it, so new API actions answer "Unknown action" until you do.
- Check it in the browser at https://d2duffmg4ei2rq.cloudfront.net/g, at desktop and phone widths. The dev server
  is `npm run dev` on port 47213.
- The owner often follows along remotely: send screenshots and files rather than describing them.
