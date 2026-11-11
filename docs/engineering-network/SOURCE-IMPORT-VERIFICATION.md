# Engineering Network V4.5 — Git Source Import Verification

**Verification date:** 2026-11-11  
**Repository:** Jamescheng2022/sourcerating  
**Isolated branch:** feature/engineering-network-v45-concrete-20261111  
**Source directory:** apps/engineering-network/

## Result: PASS — full source is checked into GitHub

- Import workflow: https://github.com/Jamescheng2022/sourcerating/actions/runs/43040150343
- Independent source CI workflow: https://github.com/Jamescheng2022/sourcerating/actions/runs/43040492098
- Latest independently verified branch head at check: \`9a48f04bc80065eb6190b48004c608a7f3a5f512\`
- GitHub tree API recursive: **172 regular files**, **13,283,405 bytes** in \`apps/engineering-network/\`, \`truncated: false\`.
- \`src/\` source modules: **71**.
- Engineering illustrations \`.svg\`: **52**.
- JSON files: **7**, including the Atlas archive.
- Verified by GitHub connector: \`package.json\`, \`package-lock.json\`, original \`FeedPage.jsx\`, \`EngineeringPublisherWizard.jsx\`, \`EngineeringCloudDrafts.jsx\`, \`enPilotClient.js\`, \`engineeringArticleLayouts.js\`, visual template asset and World Bank archive.
- Complete clean npm install and Vite build both passed in the import workflow AND the independent source CI.
- Preview-only \`noindex,nofollow\` and conservative unit/HTML escape checks passed.
- No production branch or sourcerating.com domain was changed.

## Important limitations / remaining release blockers

Git and CI verification do NOT mean production readiness. True signup/email verification, cross-device private draft read/write, real paid-model completion and external provider costs, authenticated media storage, public article approval/canonical URLs, SEO migration, claim-ownership moderation, B2B outreach compliance and rollback rehearsals still require independent verification.

## Build locally (no temporary archive dependency)

\`\`\`bash
git clone https://github.com/Jamescheng2022/sourcerating.git
cd sourcerating
git checkout feature/engineering-network-v45-concrete-20261111
cd apps/engineering-network
npm ci
npm run build
\`\`\`

**CAUTION:** This is a public repository with public-source data and the frontend's publishable Supabase key. NEVER commit Supabase secret keys, service roles, private tokens, user files, production environment files, or private email contact lists.

Go-live plan: \`docs/engineering-network/CONCRETE-LAUNCH-PLAN.md\`. Status: **Git source PASS; production switch HOLD**.
