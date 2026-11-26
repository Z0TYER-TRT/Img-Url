# Contributing

Thanks for looking. This is a small project, so the rules are short.

## What it is

A self-hosted image and video host. One admin uploads files, anything with a link
can view them, and bots upload with an API key. Two apps: a Next.js panel and a
NestJS API, both talking to MongoDB and Backblaze B2.

## Ground rules

- **Small, focused changes.** One concern per pull request.
- **The app serves one admin.** No signups, no multi-tenant work, no roles.
- **Media only.** Images and video; anything else is out of scope.
- **Files are public, keys are private.** Keep that split intact.

## Setup

Requires Node 22+, npm 10+, and a MongoDB you can reach (a container or a free
Atlas cluster).

```bash
git clone https://github.com/Z0TYER-TRT/Img-Url
cd Img-Url
npm install
cp .env.example .env
```

Fill `.env` with real values — `SESSION_SECRET` from `openssl rand -hex 32`, a
password of 8–15 characters, and a `B2_ACCOUNTS` entry. The API refuses to start
on the example secrets, which is deliberate; the log names the variable.

```bash
npm --workspace apps/api run start:dev     # http://localhost:3001
npm --workspace apps/web run dev           # http://localhost:3000
```

The web app rewrites `/api/*` and `/f/*` to the API, so the browser only ever
talks to one origin and cookies work unchanged.

Without real B2 credentials uploads return `503 … Malformed Access Key Id`. That
is expected: validation, auth and the redirect path all work before B2 is
contacted.

## Tests

```bash
npm --workspace apps/api test            # unit: config, mime, storage, keys, rate limit
npm --workspace apps/api run test:e2e    # HTTP flow against in-memory Mongo + fake B2
npm --workspace apps/web run build       # type-check and production build
npm --workspace apps/web run test:smoke  # needs the build first
```

There is no CI yet, so run these before opening a pull request. A change without
a test is fine only if it is genuinely untestable (a CSS value, a copy change).
Anything with a branch, a loop, or a trust boundary needs one.

## The lockfile rule

Each Docker image installs from its **own** `apps/*/package-lock.json`. `npm install`
at the repository root only updates the workspace lock, so adding a dependency
leaves the image build failing with `npm error Missing: <pkg> from lock file`.

```bash
sh scripts/sync-lock.sh    # after adding or removing a dependency
git add apps/*/package-lock.json
```

## Code layout

```
apps/api/src
  config.ts              env parsing and validation, refuses bad config at boot
  storage/               B2 clients, bucket picking, presigned URLs
  auth/                  one admin, cookie session, guard
  keys/                  API keys (hashed) and the guard that reads them
  files/                 upload, list, delete, public /f/:id redirect
apps/web/app
  page.tsx               login (split layout)
  admin/(layout|shell)   auth guard + sidebar
  admin/{library,keys,developers}
  globals.css            the whole design system, one file
scripts/                 duckdns.sh, sync-lock.sh
```

## Commits

Conventional prefixes, because the changelog is written from them:

```
feat(api): describe the user-visible addition
fix(web): describe the bug that is now gone
docs: readme or comments
chore: tooling, deps, housekeeping
security: anything that closes a hole
```

## Pull request checklist

- [ ] The suites above pass locally.
- [ ] `sh scripts/sync-lock.sh` was run if dependencies changed.
- [ ] New behaviour has a test, or a line saying why it cannot have one.
- [ ] No secret, token or real bucket name is committed.
- [ ] The change works at 320 px and at 1920 px if it touches the UI.

## Reporting a security issue

Do not open a public issue. Email the maintainer, or use GitHub's **Security →
Report a vulnerability**. Assume a leaked secret is compromised: rotate it first
(B2 key, `SESSION_SECRET`, DuckDNS token), then report.

## License

MIT. By contributing you agree your work is licensed the same way.
