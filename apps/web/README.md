This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) before development or a production build.
Use `.env.example` as a template for an ignored `.env.local`, or supply these in
the process environment. Only a public anon/publishable key belongs in a client
build; never use a service-role key. Missing configuration fails instead of
contacting a live backend. For the local stack the URL is
`http://127.0.0.1:54321`. These values are baked into the browser bundle, so rebuild
after changing the target. The client and analyze API route use the same config.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

The app uses system fonts; builds do not fetch Google Fonts.

## Local stage 2 acceptance

From this directory, after applying the repo migrations to the local stack and
building with its public key, run `node scripts/s2-web-e2e.cjs e2e`,
`node scripts/s2-web-e2e.cjs inquiries`, and `node scripts/s2-web-e2e.cjs ui`.
The runner refuses a nonlocal Supabase URL, starts/stops a production Next server
on 127.0.0.1:3000, and uses isolated headless Chrome contexts. It reads the lane's
CLI, Playwright installation and synthetic passwords outside Git. Set
`S2_EVIDENCE_DIR` to a separate artifact directory for each suite. These tests retain
their synthetic fixtures; they do not delete data or send mail.

Inquiry acknowledgement atomically marks the buyer's task done and retains the
inquiry with `acknowledged_at`. The RPC derives authorization from active room and
owner-organization memberships. Clients retain SELECT-only inquiry access; the
submitter organization is a database-derived snapshot on new submissions. Older
inquiries explicitly show that the organization was not recorded. Repeated or
concurrent acknowledgement leaves the first resolution timestamp unchanged.

The UI suite covers the accepted U1 P1/P2 findings, 390px navigation and proposal
review, join recovery, file-check scope, sign-out confirmation, AI-off status, and
acknowledgement denials. File byte checks establish size/hash/detected type only.
They do not establish document authenticity or malware safety.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Cloud acceptance on Linux

Install Node 24+, Python 3.12, Chromium, Deno and the Supabase CLI. Run `npm ci` in this directory. Keep the original production target exclusion and use only an isolated local synthetic stack. The test runner now accepts:

- `S2_SUPABASE_CLI`: CLI executable (defaults to `supabase` on PATH).
- `S2_SUPABASE_WORKDIR`: isolated stack work directory (defaults to repository root).
- `S2_PLAYWRIGHT_MODULE`: installed Playwright module path.
- `S2_BROWSER_PATH`: Chromium binary (Linux default `/usr/bin/chromium`).
- `S2_PASSWORD_FILE`: outside-repository synthetic seed password JSON.
- `S2_EVIDENCE_DIR`: fresh outside-repository evidence directory for each suite.

Run `node scripts/s2-web-e2e.cjs export` after applying migration `202610230001_room_evidence_export.sql`. This new suite tests authenticated snapshot exports, anonymous/cross-room/removal denials and the actual UI download. Run existing `e2e`, `inquiries`, `ui` and `review` modes separately as well. Standalone `recovery` runs the original B8 Auth recovery assertions with its own synthetic account; the full `review` still includes those assertions. The export includes conversation, file metadata and decision history, **not file bytes**. It does not issue signed download URLs or use a service role. Downloaded files contain private project content and should be stored accordingly.

The append-only migration adds one security-invoker function and grants execute only to authenticated callers. Rollback removes that function; previous tables and data remain unchanged. Do not apply to hosted production during cloud development.

The retained game example API is separate from the project-room backend. Its local smoke command is `python -m unittest discover -s tests -v` from `apps/api` after installing `requirements.txt`. It is a stateless simulation, not an authenticated business service.
