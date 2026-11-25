# ImgUrl

A self-hosted image and video host. Upload a file, get a permanent public link.
One admin, no signups, no third-party CDN.

```
https://myimages.duckdns.org/f/AbC123xYz9
```

- Files live in **Backblaze B2** (1 to 10 buckets, uploads spread across them).
- Metadata lives in **MongoDB**.
- Playback redirects straight to B2, so media bytes never pass through your server.
- Bots can mint the same links with an API key.

## How it works

```
Internet ──▶ Caddy (HTTPS, one DuckDNS name)
              ├── /f/*    ──▶ NestJS ──302──▶ Backblaze B2 (presigned, 12 h)
              ├── /api/*  ──▶ NestJS ──▶ MongoDB
              └── else    ──▶ Next.js (login + admin panel)
```

Ids are 10 random alphanumeric characters, so links are unguessable but public to
anyone who has one. An unknown id is a 404, never an error page.

## What you get

Four pages behind one login, all at the same hostname:

| Page | URL | What it does |
|---|---|---|
| Upload | `/admin` | drop a file, copy the link |
| Library | `/admin/library` | contact sheet of everything, copy or delete |
| API | `/admin/keys` | create and revoke bot keys |
| Developers | `/admin/developers` | the endpoint plus cURL, Python, Node and PHP examples |

The sidebar collapses, `Ctrl K` jumps between pages, and the theme toggle is
light or dark — decided on the server, so a reload never flashes the wrong one.

## Requirements

- A VPS with Docker and Compose v2. **1 vCPU / 1 GB RAM / 10 GB disk** runs it;
  2 GB is comfortable, since MongoDB takes a share of RAM for its cache. Media
  never lands on the disk, only MongoDB metadata.
- Ports **80** and **443** reachable from the internet (Caddy needs 80 for the
  certificate).
- A DuckDNS name and one Backblaze B2 account.
- Uploads pass through the VPS, so its upload bandwidth is your ceiling while a
  file is being stored. A 50 MB clip takes as long as your line allows.

## Deploy

### 1. DuckDNS

DuckDNS does one job: it makes `myimages.duckdns.org` resolve to your server. It
provides no certificate and no proxy. Caddy gets a normal Let's Encrypt
certificate over **HTTP-01** the first time it starts — no certbot, no renewal
cron, no DNS plugin.

1. Create a name at <https://www.duckdns.org> (say `myimages`) and copy the token
   shown on the dashboard.
2. Point the name at the server, either way:
   - paste the server's IPv4 into the DuckDNS dashboard, or
   - run `DUCKDNS_TOKEN=xxx sh scripts/duckdns.sh` — it asks DuckDNS to use the
     address the request came from, so it works on a machine with a changing IP.
3. Open **80** and **443** on the server: `ufw allow 80,443/tcp`.

If your IP changes, let cron keep it current — no app restart needed:

```cron
*/10 * * * * cd /opt/imgurl && DUCKDNS_TOKEN=xxx sh scripts/duckdns.sh >/dev/null 2>&1
```

Two limits worth knowing before you start:

- **No wildcard.** DuckDNS gives one name, so `abc.myimages.duckdns.org` will not
  resolve. That is why file links are `https://myimages.duckdns.org/f/<id>` and
  not per-file subdomains.
- **Resolve first.** The name must point at the server before the first
  `docker compose up`, or Caddy's first certificate attempt fails. It retries on
  its own, so a wrong order costs a few minutes rather than a broken install.

Check it before moving on:

```bash
dig +short myimages.duckdns.org     # must print your server's IPv4
```

### 2. Backblaze B2

1. Create a **private** bucket, note its region (e.g. `us-west-004`).
2. Create an **application key** restricted to that bucket with capabilities
   `listFiles, readFiles, writeFiles, deleteFiles`.
3. Repeat for up to 10 buckets if you want uploads spread across them. Each entry
   in `B2_ACCOUNTS` needs its **own** bucket — the same bucket twice is rejected
   at boot, because a file records only its bucket name. Buckets may sit in
   different regions; each entry carries its own.

Uploads go to the account holding the fewest files, and fall through to the next
one if a bucket rejects the write. `.env.example` shows the exact JSON for one
account and for three.

Never delete a bucket you still have files in — those links become 404.

### 3. Get the code

```bash
git clone <your-fork> /opt/imgurl
cd /opt/imgurl
```

### 4. Configure

```bash
cp .env.example .env
```

| Variable | What to put |
|---|---|
| `PUBLIC_HOST` | `myimages.duckdns.org` — Caddy uses it for the certificate |
| `PUBLIC_ORIGIN` | `https://myimages.duckdns.org` — the base of every generated link |
| `ADMIN_EMAIL` | your Gmail, used as the login name |
| `ADMIN_PASSWORD` | 8–15 characters |
| `SESSION_SECRET` | `openssl rand -hex 32` — changing it logs out every session |
| `MONGODB_URI` | `mongodb://mongo:27017/imgurl`, or an Atlas URI (below) |
| `B2_ACCOUNTS` | the JSON array from step 2 |
| `DUCKDNS_TOKEN` | optional, only for `scripts/duckdns.sh` |
| `MAX_UPLOAD_MB` | 50 unless you want another cap |

`PUBLIC_ORIGIN` is the one value to get right: links are built from it, not from
the request, so a wrong host produces working uploads with broken links.

The app refuses to boot on a missing variable, a password outside 8–15, a
`SESSION_SECRET` shorter than 32 characters, more than 10 accounts, a duplicate
bucket, or the example secrets from `.env.example`.

#### Database: the bundled container, or MongoDB Atlas

The default is the `mongo` container that compose starts for you. Nothing to do.

**Atlas instead** — useful when the box is small, or when you want the database
somewhere other than the server that serves files:

1. Create a free **M0** cluster at <https://cloud.mongodb.com>. 512 MB is far more
   than enough: MongoDB holds only file metadata. The bytes live in B2.
2. **Database Access** → add a user with a password. Use letters and numbers, or
   URL-encode the special ones — `p@ss` must be written `p%40ss` inside the URI.
3. **Network Access** → add the server's public IPv4. `0.0.0.0/0` works too and
   is what people usually do for a personal box, but it is the internet.
4. **Connect → Drivers** → copy the string, then **add the database name**:

   ```env
   MONGODB_URI=mongodb+srv://imgurl:p%40ss@cluster0.abc123.mongodb.net/imgurl?retryWrites=true&w=majority
   ```

   Without `/imgurl` MongoDB silently uses a database called `test`, and your
   files will look like they vanished if you ever "fix" the URI later.

5. Start as usual. The local `mongo` container is now unused — it costs about
   150 MB of RAM, so stop it:

   ```bash
   docker compose stop mongo
   ```

If `mongodb+srv://` fails with a DNS error, the box cannot resolve Atlas SRV
records. Use the non-SRV string instead (`mongodb://host1:27017,host2:27017/...`),
which Atlas also shows under "Connect → Drivers → I don't have a SRV connection".

Atlas manages its own backups on paid tiers; on M0 take one yourself (see
Operating it).

### 5. Start

```bash
docker compose up -d --build
docker compose ps
```

All four services should be `running`, and `api` should say `healthy` within a
few seconds. That means MongoDB is reachable and the configuration parsed.

### 6. Verify

```bash
curl -s https://myimages.duckdns.org/health      # {"ok":true,"mongo":"up"}
curl -sI https://myimages.duckdns.org | head -1  # HTTP/2 200, valid certificate
```

Then open `https://<PUBLIC_HOST>`, sign in, and do these five checks — they cover
what unit tests cannot:

1. Upload a small image. Copy the link, open it in a private window. It renders.
2. Upload a **>6 minute** video, open it, wait six minutes, then seek to 00:05:00.
   It still plays — that proves the presigned URL outlives a long session.
3. Delete the image in the panel. Its old link now returns 404, not 500.
4. Create an API key and run the curl from the next section. You get a working URL.
5. Revoke that key and run the same curl again. You get 401.

## Operating it

### Behind an existing reverse proxy

If the server already runs nginx (or Traefik, or Caddy on the host), Caddy must
not start — two processes cannot own ports 80 and 443. Use the override:

```bash
docker compose -f docker-compose.yml -f docker-compose.nginx.yml up -d
```

That disables the `caddy` service and publishes the app on loopback only:

| Container | Host address |
|---|---|
| `web` (site) | `127.0.0.1:3200` |
| `api` (`/api/*`, `/f/*`, `/health`) | `127.0.0.1:3201` |

Edit the two ports in `docker-compose.nginx.yml` if they are taken.

Then an nginx server block — note `client_max_body_size`, without it nginx
rejects uploads over 1 MB with its own 413 before they reach the app:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name myimages.duckdns.org;

    client_max_body_size 55m;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location /api/ {
        proxy_pass http://127.0.0.1:3201;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /f/       { proxy_pass http://127.0.0.1:3201; proxy_set_header Host $host; }
    location /health   { proxy_pass http://127.0.0.1:3201; proxy_set_header Host $host; }

    location / {
        proxy_pass http://127.0.0.1:3200;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable it, then let certbot add TLS and the redirect:

```bash
ln -s /etc/nginx/sites-available/imgurl /etc/nginx/sites-enabled/imgurl
nginx -t && systemctl reload nginx
certbot --nginx -d myimages.duckdns.org --redirect -m you@example.com
```

`X-Forwarded-Proto` is not optional: the Developers page builds its example URLs
from it, and the login cookie is only marked `Secure` when the app believes the
request arrived over HTTPS.

```bash
docker compose logs -f api        # or caddy, web, mongo
docker compose restart api
docker compose down               # stop, keep data
docker compose up -d              # start again
```

**Update** after pulling a new version:

```bash
git pull
docker compose up -d --build
```

Changed something in `.env`? `docker compose up -d` re-creates the containers with
the new values; nothing else to restart.

**Backup.** B2 already holds the bytes; back up the metadata.

Bundled container:

```bash
docker compose exec -T mongo mongodump --archive --gzip > imgurl-$(date +%F).gz
gunzip -c imgurl-2026-11-25.gz | docker compose exec -T mongo mongorestore --archive --gzip
```

Atlas — dump it through the same image, so nothing needs installing on the host:

```bash
docker run --rm -e URI="$MONGODB_URI" mongo:7 \
  sh -c 'mongodump --uri="$URI" --archive --gzip' > imgurl-$(date +%F).gz
```

Losing MongoDB loses the index, not the files: the objects stay in B2 but the
links and their ids are gone.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Caddy logs `acme: ... could not get certificate` | DNS not pointing here yet, or port 80 blocked | `dig +short <host>`, `ufw allow 80`, then `docker compose restart caddy` |
| Browser shows `502 Bad Gateway` | the API container stopped | `docker compose logs api` |
| Upload returns `503` with `All N storage account(s) failed` | wrong `keyId`, `appKey` or bucket name | the panel shows the B2 reply; recheck the key's bucket and capabilities |
| Upload returns `413` | file over `MAX_UPLOAD_MB` | raise the limit and `docker compose up -d`, or use a smaller file |
| Login suddenly returns 401 with the right password | `ADMIN_PASSWORD` or `SESSION_SECRET` changed | sign in again; old cookies are invalidated on purpose |
| An old link now 404s | its bucket was removed from `B2_ACCOUNTS` | put the entry back exactly as it was |
| Build fails with `npm ci` / `Missing: <pkg> from lock file` | a dependency was added but the app's own lock was not updated | `sh scripts/sync-lock.sh`, commit the lock, rebuild |
| `docker compose up` fails with `port is already allocated` | something else owns 80/443 | stop it: `ss -lptn 'sport = :80'` |

## API for bots

Create a key on the **API** page. The raw key is shown once.

```bash
curl -H "Authorization: Bearer ik_..." \
     -F "file=@photo.png" \
     https://myimages.duckdns.org/api/v1/files
```

```json
{ "id": "AbC123xYz9", "url": "https://myimages.duckdns.org/f/AbC123xYz9",
  "kind": "image", "mime": "image/png", "size": 48213, "name": "photo.png",
  "views": 0, "createdAt": "2026-11-25T10:00:00.000Z" }
```

Limits: 50 MB per file, 30 uploads per minute per key, images and videos only —
decided by the file's bytes, not its name or the header the client sends. The
**Developers** page shows the same examples in cURL, Python, Node and PHP with a
copy button.

Bots can only upload. Listing and deleting need the admin cookie.

## Costs and limits

- **B2 free egress is 3× your stored data per month**, then $0.01/GB. Every full
  view of a video counts, so a 40 MB clip watched 100 times is 4 GB. Free egress
  through Cloudflare is possible later, but this project deliberately does not
  require Cloudflare.
- Storage is $6.95/TB/month; the first 10 GB are free.
- Caddy, MongoDB and Next.js need roughly 512 MB of RAM together.
- The redirect URL is signed for **12 hours**. Browsers follow the 302 once and
  keep using that URL for range requests, so a long video keeps seeking without
  going back through `/f/<id>`. Re-opening the share link always mints a fresh one.

## Local development

```bash
npm install
# needs a MongoDB; any local instance or a free Atlas cluster
cp .env.example .env    # point MONGODB_URI at it
npm --workspace apps/api run start:dev
npm --workspace apps/web run dev
```

The web app rewrites `/api/*` and `/f/*` to `http://localhost:3001` in dev, so the
browser only ever talks to one origin and cookies work unchanged.

After adding or removing a dependency, run `sh scripts/sync-lock.sh` and commit
the lock it touches. Each Docker image installs from its own `apps/*/package-lock.json`,
which `npm install` at the repo root does not update.

## Tests

```bash
npm --workspace apps/api test          # unit: config, mime sniffing, storage, keys, rate limit
npm --workspace apps/api run test:e2e  # HTTP flow against in-memory Mongo and a fake B2
npm --workspace apps/web run build     # type-check and production build
npm --workspace apps/web run test:smoke  # boots the built server against a stub API
```

`test:smoke` needs the web build first. It starts the real standalone server,
points it at a stub API that always returns 401, and checks the login page renders
and `/admin` redirects away.

The e2e suite covers login, cookie auth, upload, magic-byte rejection, the 413
cap, the public redirect, view counting, pagination and its total, delete, API
keys and revocation.

## Security notes

- One admin account from env. The password is never stored; the comparison is
  timing-safe, and the session cookie carries a fingerprint of the current
  password, so changing `ADMIN_PASSWORD` or `SESSION_SECRET` logs out every
  existing session. The cookie is HttpOnly, SameSite=Lax and `Secure` in
  production.
- Login is limited to 5 requests per minute per IP (successful logins count too).
- Uploads are validated by magic bytes; only image and video types the server can
  name are accepted, so SVG (which can carry script) and TIFF are rejected.
- Buckets stay private. Public links are 302s to short-lived presigned URLs.
- Caddy sets HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`, a referrer
  policy and a permissions policy on every response, and strips `Server` and
  `X-Powered-By`. `/api/*` and `/f/*` also send a deny-all CSP.
- Session tokens are pinned to HS256 on verification, so a forged `alg: none`
  token is rejected before the signature is even considered.
- Files are served from Backblaze's domain, never from your origin, so a hostile
  file cannot run script in the panel's context.
- MongoDB and the API are not published to the host; only Caddy listens publicly.

## License

MIT
