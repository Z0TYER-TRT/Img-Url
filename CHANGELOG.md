# Changelog

All notable changes to this project. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing yet.

## [0.1.0] - 2026-11-26

First public release.

### Added

- Image and video hosting: upload a file up to 50 MB, get a permanent
  `https://<host>/f/<id>` link that anyone can open.
- Backblaze B2 storage across 1 to 10 buckets. Uploads go to the bucket holding
  the fewest files and fall through to the next one when a bucket rejects the
  write.
- Playback redirects to a presigned B2 URL, so media never travels through the
  server.
- Admin panel with four pages: **Upload**, **Library**, **API keys** and
  **Developers**.
- Library contact sheet with copy, delete and cursor pagination, plus a total
  count in the sidebar.
- Bot API: `POST /api/v1/files` with `Authorization: Bearer ik_…`. Keys are stored
  as SHA-256 hashes and shown once on creation.
- Copy-paste examples in the panel for cURL, Python, Node and PHP, built from the
  live hostname.
- Collapsible sidebar, `Ctrl K` page switcher, light and dark themes. The theme
  is chosen on the server from a cookie, so a reload never flashes the wrong one.
- Docker Compose deployment with Caddy (automatic HTTPS), and
  `docker-compose.nginx.yml` for servers that already run a reverse proxy.
- `scripts/duckdns.sh` to keep a DuckDNS A record pointing at the machine.
- `scripts/sync-lock.sh` to regenerate the per-app lockfiles the images install
  from.
- MongoDB Atlas as an alternative to the bundled container.
- 30 unit tests and 18 end-to-end tests, plus a smoke test that boots the built
  web server.

### Changed

- Presigned redirects now last **12 hours** instead of 5 minutes. Browsers follow
  the redirect once and reuse that URL for range requests, so a long video keeps
  seeking instead of failing with an expired signature.
- Files record the **bucket name** they live in rather than the account's array
  position, so reordering `B2_ACCOUNTS` can no longer point a delete at the wrong
  bucket.

### Fixed

- Deleting a file removes the database row first, then the object, so a storage
  failure leaves an invisible orphan instead of a link that redirects to nothing.
- A failed view counter can no longer turn a view into a 500.
- A malformed pagination cursor returns the first page instead of a 500.
- The rate-limit map no longer grows without bound as new IPs arrive.
- Uploads named with path separators are stored as metadata only — the object key
  is generated, never taken from the filename.
- Web UI is usable from 320 px to 1920 px: no horizontal overflow anywhere, form
  controls at 16 px so iOS does not zoom on focus, touch targets at 40 px.
- The theme is rendered by the server; the previous inline script made React warn
  and forced full reloads in development.
- The web image builds again after adding dependencies: its lockfile was stale,
  so `npm ci` refused to install.

### Security

- Caddy sends HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`, a referrer
  policy and a permissions policy, strips `Server` and `X-Powered-By`, and sends
  a deny-all CSP on `/api/*` and `/f/*`.
- Session tokens are verified with an explicit HS256 algorithm list, so a forged
  `alg: none` token is rejected before the signature is considered.
- The session cookie carries a fingerprint of the current password: changing
  `ADMIN_PASSWORD` or `SESSION_SECRET` logs out every existing session.
- Uploads are typed by magic bytes; SVG (which can carry script) and unknown
  types are rejected. Buckets stay private.
- Login is limited to 5 requests per minute per IP; bot uploads to 30 per minute
  per key.
- The API refuses to boot with the example secrets from `.env.example`, more than
  10 storage accounts, or two accounts sharing one bucket.

[Unreleased]: https://github.com/Z0TYER-TRT/Img-Url/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Z0TYER-TRT/Img-Url/releases/tag/v0.1.0
