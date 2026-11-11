#!/usr/bin/env bash
set -euo pipefail
# SourceRating Engineering Network V4.5: preserve original V4.2 feed.
# Preview ONLY, production domain untouched.
URL='https://sb-3o7tsecgzh4q.vercel.run/sr-v45-auth-drafts-20261111.tgz'
GZIP_SHA='8360f79e39edd3501b8cf1b3873ea45b929f6a6526767d42ae21466adbb6ed7c'
TAR_SHA='03408f3281530ae6c8d570c2da54c65b5319692d252765b0a30c8713a788ad41'
curl -fsSL --retry 2 --connect-timeout 12 --max-time 190 "$URL" -o source-v45.tar
actual="$(sha256sum source-v45.tar | awk '{print $1}')"
if [[ "$actual" != "$GZIP_SHA" && "$actual" != "$TAR_SHA" ]]; then echo "Archive checksum mismatch" >&2; exit 45; fi
mkdir -p v
tar -xf source-v45.tar -C v
test -f v/src/services/enPilotClient.js
test -f v/src/components/article/EngineeringCloudDrafts.jsx
test -f v/src/components/modals/EngineeringPublisherWizard.jsx
test -f v/public/data/atlas/manifest.json
cd v
npm ci --no-audit --no-fund
npm run build
test -f dist/index.html
test -f dist/data/atlas/manifest.json
test "$(find dist/visual-templates -maxdepth 1 -name '*.svg' | wc -l)" = 52
echo V45_PRIVATE_DRAFT_BUILD_VERIFIED
