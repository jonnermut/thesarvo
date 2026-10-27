#!/usr/bin/env bash
# Rebuilds what changed in the content repo and publishes it, then waits until CloudFront serves it. The GitHub Action in
# thesarvo-content (.github/workflows/publish.yml) runs this after every push (plan-backend B3, proof of concept).
#   scripts/publish.sh [content dir]
# In the repo it runs the TypeScript with tsx. In the publisher package (scripts/package-publisher.sh), where it sits beside the
# bundled build-site.mjs and deploy-changed.mjs, it needs only node: no checkout of the app, no npm install, no vite build.
# Prints, and adds to the Action's summary, how long each step took and how long after the commit the site showed it.
set -euo pipefail

CONTENT=${1:-../../thesarvo-content}
HERE=$(cd "$(dirname "$0")" && pwd)
OUT=${OUT:-dist/site}
if [ -f "$HERE/build-site.mjs" ]; then
  build=(node "$HERE/build-site.mjs" --package "$HERE"); deploy=(node "$HERE/deploy-changed.mjs")
else
  build=(npx tsx scripts/build-site.ts); deploy=(npx tsx scripts/deploy-changed.ts)
fi
SITE=${SITE:-https://d2duffmg4ei2rq.cloudfront.net}
DISTRIBUTION=${DISTRIBUTION:-E1UB3F13YZEV4}
# In the Action the keys come from the environment; locally, the agent's profile.
[ -n "${AWS_ACCESS_KEY_ID:-}" ] || export AWS_PROFILE=${AWS_PROFILE:-claude-agent-thesarvo}
export AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION:-ap-southeast-2}

commit=$(git -C "$CONTENT" rev-parse HEAD)
committed=$(git -C "$CONTENT" log -1 --format=%ct)
start=$(date +%s)
summary=${GITHUB_STEP_SUMMARY:-/dev/null}
printf '| Step | Seconds after the commit |\n|---|---|\n' >> "$summary"
lap() {
  echo "$1: $(( $(date +%s) - committed ))s after the commit, $(( $(date +%s) - start ))s into this script"
  echo "| $1 | $(( $(date +%s) - committed )) |" >> "$summary"
}
# The deployed build says which content commit it was built from.
live() { [ "$(curl -s "$SITE/g-data/build.json?t=$(date +%s%N)" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).content)}catch{}})")" = "$commit" ]; }

lap started
"${build[@]}" --dir "$CONTENT" --out "$OUT" --incremental | { grep -E '^(Changed since|Wrote data|The app changed|No deployed)' || true; }
lap built
# Until scripts/publish-setup.sh --new-key has put a key in the repo's secrets, the Action only builds.
[ -z "${CI:-}" ] || [ -n "${AWS_ACCESS_KEY_ID:-}" ] || { echo "no AWS key in the Action's secrets: built only, not published"; exit 0; }
"${deploy[@]}" --dist "$OUT"
lap deployed
# Pages and data are uploaded no-cache, so CloudFront already serves them: invalidating is only for when it does not.
if live; then lap visible; else
  invalidation=$(aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION" --paths '/g/*' '/g-data/*' '/index.html' --query Invalidation.Id --output text)
  lap "not visible after deploying: invalidation $invalidation sent"
  for _ in $(seq 150); do live && break || sleep 2; done
  live && lap visible || { lap "not visible after 5 minutes"; exit 1; }
fi
