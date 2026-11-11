#!/usr/bin/env bash
set -euo pipefail
# Original V4.2 frontend, V4.3 P0/P1, V4.4 editorial layouts + rule-based preflight.
# Deploy ONLY to SourceRating independent preview project. No production changes.
curl -fsSL --retry 3 --connect-timeout 15 --max-time 180 'https://sb-3o7tsecgzh4q.vercel.run/sr-v44-editorial-source-20261111.tgz' -o source-v44.tar
actual="$(sha256sum source-v44.tar | awk '{print $1}')"
if [[ "$actual" != '1804bfd6d3a9c1f047abbaed5604682f58ceadf436af4148214be1b79307f8c1' && "$actual" != 'ea743faba50c2391981f19b0a9c93a766230da5e19f892874e7ab97aec48b6ad' ]]; then
  echo "FAIL: archive checksum mismatch $actual" >&2
  exit 45
fi
mkdir v
tar -xf source-v44.tar -C v
test -f v/src/components/modals/EngineeringPublisherWizard.jsx
test -f v/src/data/engineeringArticleLayouts.js
test -f v/src/components/article/EngineeringArticlePreview.jsx
test -f v/public/visual-templates/manifest.json
cd v
npm ci --no-audit --no-fund
npm run build
test -f dist/index.html
test -f dist/data/atlas/manifest.json
test "$(find dist/visual-templates -maxdepth 1 -name '*.svg' | wc -l)" = 52
echo V44_EDITORIAL_BUILD_VERIFIED
