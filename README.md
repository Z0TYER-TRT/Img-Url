# ImgUrl

A self-hosted image and video host. Upload a file, get a permanent public link.
One admin, no signups, no third-party CDN.

```
https://your-name.duckdns.org/f/AbC123xYz9
```

- Files live in **Backblaze B2** (1 to 10 buckets, uploads spread across them).
- Metadata lives in **MongoDB**.
- Playback redirects straight to B2, so media bytes never pass through your server.
- Bots can mint the same links with an API key.

## How it works

```
Internet ──▶ Caddy (HTTPS, one DuckDNS name)
              ├── /f/*    ──▶ NestJS ──302──▶ Backblaze B2 (presigned, 5 min)
              ├── /api/*  ──▶ NestJS ──▶ MongoDB
              └── else    ──▶ Next.js (login + admin panel)
```

An unknown link id is a 404. Ids are 10 random alphanumeric characters, so links
are unguessable but public to anyone who has one.

## Deploy (5 steps)

### 1. DuckDNS

Create a subdomain at <https://www.duckdns.org>, point it at your server's IPv4
address, and open ports **80** and **443**. Caddy gets a Let's Encrypt
certificate over HTTP-01 on first start — no DNS plugin needed.

### 2. Backblaze B2

1. Create a **private** bucket, note its region (e.g. `us-west-004`).
2. Create an **application key** restricted to that bucket with capabilities
   `listFiles, readFiles, writeFiles, deleteFiles`.
3. Repeat for up to 10 buckets if you want uploads spread across them.

### 3. Configure

```bash
cp .env.example .env
```

Fill in `PUBLIC_HOST`, `PUBLIC_ORIGIN`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`
(8–15 characters), `SESSION_SECRET` (`openssl rand -hex 32`) and `B2_ACCOUNTS`.

### 4. Start

```bash
docker compose up -d --build
```

### 5. Log in

Open `https://<PUBLIC_HOST>` and sign in with the env credentials. Upload
something, copy the link, open it in a private window.

## API for bots

Create a key in the panel under **API keys**. The raw key is shown once.

```bash
curl -H "Authorization: Bearer ik_..." \
     -F "file=@photo.png" \
     https://your-name.duckdns.org/api/v1/files
```

```json
{ "id": "AbC123xYz9", "url": "https://your-name.duckdns.org/f/AbC123xYz9",
  "kind": "image", "mime": "image/png", "size": 48213, "name": "photo.png",
  "views": 0, "createdAt": "2026-11-25T10:00:00.000Z" }
```

Limits: 50MB per file, 30 uploads per minute per key, images and videos only
(decided by the file's bytes, not its name or the header the client sends).

Anything that speaks HTTP works: Telegram bots, Discord bots, shell scripts,
your own services.

## Costs and limits

- **B2 free egress is 3× your stored data per month**, then $0.01/GB. Every
  full view of a video counts, so a 40MB clip watched 100 times is 4GB.
  Free egress through Cloudflare is possible later, but this project
  deliberately does not require Cloudflare.
- Storage is $6.95/TB/month; the first 10GB are free.
- Caddy, MongoDB and Next.js need roughly 512MB of RAM together.
- The redirect URL is signed for **5 minutes**. A long video keeps playing
  because the player re-requests `/f/<id>` for each range; a link pasted into
  a download manager later still works, because the manager asks `/f/<id>` again.

## Local development

```bash
npm install
# needs a MongoDB; any local instance or a free Atlas cluster
cp .env.example .env    # point MONGODB_URI at it
npm --workspace apps/api run start:dev
npm --workspace apps/web run dev
```

The web app rewrites `/api/*` and `/f/*` to `http://localhost:3001` in dev.

## Tests

```bash
npm --workspace apps/api test         # unit: config, mime sniffing, storage, keys, rate limit
npm --workspace apps/api run test:e2e  # full HTTP flow against in-memory Mongo and fake B2
npm --workspace apps/web run build     # type-check and production build
npm --workspace apps/web run test:smoke # boots the built server against a stub API
```

`test:smoke` needs `npm --workspace apps/web run build` first. It starts the
real standalone server, points it at a stub API that always returns 401, and
checks the login page renders and `/admin` redirects away.

The e2e suite covers login, cookie auth, upload, magic-byte rejection, the 413
cap, the public redirect, view counting, pagination, delete, API keys and
revocation.

## Security notes

- One admin account from env; password stored nowhere but the hash comparison
  at boot. The session is an HttpOnly, SameSite=Lax JWT cookie, `Secure` in
  production.
- Login is limited to 5 attempts per minute per IP.
- Uploads are validated by magic bytes; SVG is rejected because it can carry
  script and would run on your own origin.
- Buckets stay private. Public links are 302s to short-lived presigned URLs.
- MongoDB is not exposed to the host; it is only reachable on the compose
  network.

## License

MIT
