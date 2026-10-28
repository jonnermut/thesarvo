# thesarvo-3: notes for agents

The new thesarvo.com: Tasmanian climbing guides moving off Confluence to a TanStack Start app (React 19,
Tailwind 4, TypeScript, Vite, Vitest), served as a static site on S3 and CloudFront, with a small Lambda API and
Cognito sign-in. The owner is Jon. The content lives in a separate repo, `../../thesarvo-content`.

## Read first

- [docs/as-built.md](docs/as-built.md): what is deployed, the AWS inventory, how to operate it, and what is new
  compared with the live site. Start here.
- [docs/thesarvo-3-masterplan.md](docs/thesarvo-3-masterplan.md): why and the phases.
- [docs/plan-guide.md](docs/plan-guide.md) (guide view and editor), [docs/plan-navigation.md](docs/plan-navigation.md)
  (navigation, search, contents pages) and [docs/plan-backend.md](docs/plan-backend.md) (storage, auth, save,
  publish, legacy app endpoints).
- [docs/plan-mvp.md](docs/plan-mvp.md): everything still needed before cutover (history, restricted pages, extra pages,
  forum, apps, avatars, add a page) and the cutover plan.
- [docs/lambda-backend.md](docs/lambda-backend.md) (the Lambda, timings, costs),
  [docs/auth-comparison.md](docs/auth-comparison.md), [docs/live-site-differences.md](docs/live-site-differences.md),
  [docs/todo.md](docs/todo.md), [scripts/aws/README.md](scripts/aws/README.md) (the agent's AWS rights).
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
  in [scripts/aws/README.md](scripts/aws/README.md); ask the owner when it lacks one rather than switching profile.
- **Content changes publish themselves.** Every push to `main` of `../../thesarvo-content` runs the Publish Action (about 15 s to live, with the latest `publisher` package), so editing files there directly publishes them like a save. The Action uses minutes from a 2,000 a month allowance; do not push content in bursts. See plan-backend B3.
- **A push to `master` deploys the app.** The `publisher` workflow builds the package and releases it, which starts a full publish of the content repo (live in about 20 s). Work on a branch and merge to `master` only when it should go live; branch pushes deploy nothing. Check `typecheck`, `lint`, `test` and the build first.
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
- Readers must never download the editor: `npm run check-bundle` guards it.

## Before every commit

1. **Docs.** Update every doc the change affects in the same commit: [docs/as-built.md](docs/as-built.md) for
   anything deployed, any infrastructure or script, and new user-visible features (its "New compared with the
   live site" list); the matching plan doc (mark items done, record decisions); `docs/todo.md`; the README for
   new commands or layout; this file for new rules.
2. **Typecheck:** `npm run typecheck` (TS 7).
3. **Lint:** `npm run lint` (eslint; needs TS 6, installed as `typescript`).
4. **Tests:** `npm test`, all passing.
5. **Build** when the change touches build or bundling: `npm run build` and `npm run check-bundle`.
6. Commit with a message that says what changed and why, ending with the `Co-Authored-By:` trailer for the model
   that wrote it.

CI (`.github/workflows/thesarvo-3.yml`) runs typecheck, lint, tests, build and check-bundle on pushes to master and on PRs.

## After a change to the site

- Rebuild and redeploy the static site: `npm run build-site -- --dir ../../thesarvo-content`, then
  `scripts/deploy-site.sh`, then invalidate CloudFront (`E1UB3F13YZEV4`). Redeploy the Lambda
  (`scripts/deploy-lambda.sh`) when server code changes.
- Check it in the browser at https://d2duffmg4ei2rq.cloudfront.net/g, at desktop and phone widths. The dev server
  is `npm run dev` on port 47213.
- The owner often follows along remotely: send screenshots and files rather than describing them.
