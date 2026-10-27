#!/usr/bin/env bash
# Builds the publisher package, dist/publisher.tgz: the app built for the static site (client/ and a server/ that carries its
# dependencies), the build and deploy scripts bundled to plain JavaScript, and publish.sh. With it the content repo's publish Action
# renders and uploads pages using only node: it needs no checkout of the app, no npm install and no vite build.
# The GitHub workflow .github/workflows/publisher.yml runs this and attaches the file to the "publisher" release.
#   scripts/package-publisher.sh
set -euo pipefail
cd "$(dirname "$0")/.."

PKG=dist/publisher
rm -rf dist "$PKG.tgz"
VITE_STATIC_SITE=1 VITE_IMAGE_BASE=/images PRERENDER_PATHS= npx vite build > /dev/null
mkdir -p "$PKG"
mv dist/client dist/server "$PKG"/
# The app's id: the tree of its committed code, which build-site.ts compares with what is deployed to decide on an incremental build.
node -e "console.log(JSON.stringify({ app: process.argv[1] }))" "$(git rev-parse HEAD:./)" > "$PKG/app.json"
npx esbuild scripts/build-site.ts scripts/deploy-changed.ts --bundle --platform=node --format=esm --target=node22 --outdir="$PKG" --out-extension:.js=.mjs \
  --banner:js="import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" --log-level=warning
cp scripts/publish.sh "$PKG"/
tar -czf "$PKG.tgz" -C "$PKG" .
echo "$PKG.tgz: $(du -h "$PKG.tgz" | cut -f1), app $(node -p "require('./$PKG/app.json').app")"
