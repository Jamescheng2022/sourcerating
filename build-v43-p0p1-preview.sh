#!/usr/bin/env bash
set -euo pipefail
# Isolated SourceRating Engineering Network V4.3 P0/P1 preview build.
# No changes to the SourceRating production project or domain.
URL="https://sb-3o7tsecgzh4q.vercel.run/sr-v43-p0p1-source-20261111.tgz"
RAW_SHA="b5ea213b43cf995647a888fb34866ab71df5077b42dc46a5646d938a320e8c8c"
TAR_SHA="9d10489ffc3c420545099ef3728ce4591edcc65c531e29b5b29a0279360afa61"
curl -fsSL --retry 2 --connect-timeout 15 "$URL" -o source-p0p1.archive
actual="$(sha256sum source-p0p1.archive | awk '{print $1}')"
if [[ "$actual" != "$RAW_SHA" && "$actual" != "$TAR_SHA" ]]; then
  echo "Source checksum mismatch: $actual" >&2
  exit 45
fi
mkdir -p v
tar -xf source-p0p1.archive -C v
test -f v/src/components/modals/EngineeringPublisherWizard.jsx
test -f v/public/visual-templates/manifest.json
test -f v/public/data/atlas/manifest.json
cd v
npm ci --no-audit --no-fund
npm run build
test -f dist/index.html
test "$(find dist/visual-templates -maxdepth 1 -name '*.svg' | wc -l)" = 52
node -e "const m=require('./dist/visual-templates/manifest.json');if(m.count!==52)process.exit(2);console.log('P0_TEMPLATE_COUNT',m.count)"
echo 'P0P1_PREVIEW_BUILD_VERIFIED'
