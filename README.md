# ImgUrl

A self-hosted image and video host. Upload a file, get a permanent public link.

![ImgUrl login screen](assets/login.png)

```
https://yourname.duckdns.org/f/AbC123xYz9
```

One admin, no signups, no third-party CDN, no per-file subdomains.

- Files live in **Backblaze B2** (1 to 10 buckets, uploads spread across them).
- Metadata lives in **MongoDB** — a container on the same box, or Atlas.
- Playback redirects straight to B2, so media bytes never pass through your server.
- Bots mint the same links with an API key.

## Contents

- [How it works](#how-it-works)
- [What you get](#what-you-get)
- [Requirements](#requirements)
- [Deploy on a VPS](#deploy-on-a-vps)
  - [1. The server](#1-the-server)
  - [2. DuckDNS](#2-duckdns)
  - [3. Backblaze B2](#3-backblaze-b2)
  - [4. Get the code](#4-get-the-code)
  - [5. Configure](#5-configure)
  - [6. Start it](#6-start-it)
  - [7. HTTPS](#7-https)
  - [8. Verify](#8-verify)
- [Using the panel](#using-the-panel)
- [API for bots](#api-for-bots)
- [Costs and limits](#costs-and-limits)
- [Operating it](#operating-it)
- [Troubleshooting](#troubleshooting)
- [Security](#security)
- [Local development](#local-development)
- [Tests](#tests)
- [License](#license)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## How it works

```
Internet ──▶ HTTPS (Caddy, or the nginx you already run)
              ├── /f/*    ──▶ API ──302──▶ Backblaze B2 (presigned, 12 h)
              ├── /api/*  ──▶ API ──▶ MongoDB
              └── else    ──▶ Next.js (login + panel)
```

Ids are 10 random alphanumeric characters, so a link is unguessable but public to
anyone who has it. An unknown id is a 404, never an error page.

## What you get

Four pages behind one login, all on the same hostname:

| Page | URL | What it does |
|---|---|---|
| Upload | `/admin` | drop a file, copy its link |
| Library | `/admin/library` | contact sheet of everything, copy or delete |
| API | `/admin/keys` | create and revoke bot keys |
| Developers | `/admin/developers` | the endpoint plus cURL, Python, Node and PHP examples |

The sidebar collapses, `Ctrl K` jumps between pages, and the theme is light or
dark — decided on the server, so a reload never flashes the wrong one.

## Requirements

- A VPS with Docker and Compose v2. **1 vCPU / 2 GB RAM / 10 GB disk** is
  comfortable; 1 GB works if MongoDB lives in Atlas instead of a container.
- Ports **80** and **443** reachable from the internet — port 80 is needed once,
  for the certificate.
- A DuckDNS name, a Backblaze B2 account, and an email for Let's Encrypt.
- Uploads pass through the VPS, so its upload bandwidth is the ceiling while a
  file is being stored. Playback does not.

## Deploy on a VPS

Written for a fresh Ubuntu/Debian box, run as root. Skip steps you already have.

### 1. The server

```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
docker compose version                 # v2.x
```

```bash
# firewall: web + ssh only
ufw allow 80,443/tcp
ufw allow ssh
ufw --force enable
```

If something already listens on 80/443 (`ss -lptn 'sport = :80 or sport = :443'`),
stop here and read [Start it → behind an existing proxy](#behind-an-existing-proxy-instead-of-caddy).

### 2. DuckDNS

DuckDNS does one job: it makes `yourname.duckdns.org` resolve to your server. It
issues no certificate and proxies nothing.

1. Create a name at <https://www.duckdns.org> and copy the token from the dashboard.
2. Point the name at the server, either way:
   - paste the server's IPv4 into the dashboard, or
   - run the script in this repo, which asks DuckDNS to use the address the
     request came from:

     ```bash
     DUCKDNS_TOKEN=your-token sh scripts/duckdns.sh
     # OK — yourname.duckdns.org now points here
     ```

3. Confirm before going further — the certificate step fails if this is wrong:

   ```bash
   dig +short yourname.duckdns.org       # must print the server's IPv4
   ```

If the IP changes, keep it current from cron:

```cron
*/10 * * * * cd /opt/imgurl && DUCKDNS_TOKEN=your-token sh scripts/duckdns.sh >/dev/null 2>&1
```

Two limits worth knowing: DuckDNS gives **one name, not a wildcard** (so
`abc.yourname.duckdns.org` will not resolve — that is why links are
`/f/<id>` and not per-file subdomains), and the name must resolve **before** you
start the proxy, or the first certificate attempt fails.

### 3. Backblaze B2

1. **Buckets → Create a Bucket**. Visibility **Private**. Note the region, e.g.
   `us-west-004`.
2. **Application Keys → Add a New Application Key**, restricted to that bucket,
   with capabilities `listFiles, readFiles, writeFiles, deleteFiles`.
   Copy `keyID` and `applicationKey` — the secret is shown once.
3. Up to 10 buckets: repeat, and add one object per bucket to `B2_ACCOUNTS`.
   Each entry needs its **own** bucket name; the same bucket twice is rejected at
   boot. Buckets may live in different regions.

Uploads go to the account holding the fewest files, and fall through to the next
one if a bucket rejects the write.

Never delete a bucket while it still holds files: each file records only its
bucket name, so those links would answer 404.

### 4. Get the code

```bash
git clone https://github.com/Z0TYER-TRT/Img-Url /opt/imgurl
cd /opt/imgurl
```

### 5. Configure

```bash
cp .env.example .env
openssl rand -hex 32          # paste the output into SESSION_SECRET
nano .env
```

| Variable | What to put |
|---|---|
| `PUBLIC_HOST` | `yourname.duckdns.org` — no scheme |
| `PUBLIC_ORIGIN` | `https://yourname.duckdns.org` — with scheme |
| `ADMIN_EMAIL` | the address you log in with |
| `ADMIN_PASSWORD` | **8–15 characters** |
| `SESSION_SECRET` | 64 hex chars from `openssl rand -hex 32` |
| `MONGODB_URI` | `mongodb://mongo:27017/imgurl`, or an Atlas URI |
| `B2_ACCOUNTS` | one line of JSON, from step 3 |
| `DUCKDNS_TOKEN` | optional, only used by `scripts/duckdns.sh` |
| `MAX_UPLOAD_MB` | `50` unless you want another cap |

`PUBLIC_ORIGIN` is the value to get right: links are built from it, not from the
request, so a wrong host gives working uploads with broken links.

The app refuses to boot on a missing variable, a password outside 8–15, a
`SESSION_SECRET` under 32 characters, more than 10 accounts, a duplicate bucket,
or the example secrets shipped in `.env.example`. Read the log if it exits — the
message names the variable.

**Example of a complete `.env`:**

```env
PUBLIC_HOST=yourname.duckdns.org
PUBLIC_ORIGIN=https://yourname.duckdns.org
ADMIN_EMAIL=you@gmail.com
ADMIN_PASSWORD=Kp7xQ2m9Lz4a
SESSION_SECRET=151377a64fc6380058e7b1cf0e07749bf9b0161a2027902916d6394a6d56698b
MONGODB_URI=mongodb://mongo:27017/imgurl
B2_ACCOUNTS=[{"keyId":"005e20ef78234370000000001","appKey":"K005...","bucket":"my-imgurl-bucket","region":"us-east-005"}]
MAX_UPLOAD_MB=50
```

#### Database: container or Atlas

The default is the `mongo` container; nothing to do.

To use **MongoDB Atlas** instead (small VPS, or the database elsewhere):

1. Create a free **M0** cluster. 512 MB is plenty — Mongo holds only metadata;
   the bytes are in B2.
2. **Database Access** → add a user. URL-encode special characters in the
   password: `p@ss` becomes `p%40ss`.
3. **Network Access** → add the server's public IPv4.
4. **Connect → Drivers** → copy the string and **append the database name**:

   ```env
   MONGODB_URI=mongodb+srv://imgurl:p%40ss@cluster0.abc123.mongodb.net/imgurl?retryWrites=true&w=majority
   ```

   Without `/imgurl`, MongoDB quietly uses a database called `test`.

5. After starting, the local container is unused — reclaim its RAM:

   ```bash
   docker compose stop mongo
   ```

If `mongodb+srv://` fails with a DNS error, the box cannot resolve Atlas SRV
records; use the non-SRV string Atlas shows further down the same Connect screen.

### 6. Start it

**With Caddy (bundled):**

```bash
docker compose up -d --build
docker compose ps
```

Expect `mongo` healthy, `api` healthy, `web` and `caddy` running. First run builds
two images and takes a few minutes.

#### Behind an existing proxy instead of Caddy

Use this when nginx (or Traefik, or another Caddy) already owns 80/443 — two
processes cannot share those ports.

```bash
docker compose -f docker-compose.yml -f docker-compose.nginx.yml up -d
```

That skips the `caddy` service and publishes the app on loopback only:

| Container | Address |
|---|---|
| `web` (site) | `127.0.0.1:3200` |
| `api` (`/api/*`, `/f/*`, `/health`) | `127.0.0.1:3201` |

Edit those two ports in `docker-compose.nginx.yml` if they are taken. Then add a
vhost — `client_max_body_size` is not optional, without it nginx rejects uploads
over 1 MB with its own 413 before the app sees them:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name yourname.duckdns.org;

    server_tokens off;
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
    location /f/     { proxy_pass http://127.0.0.1:3201; proxy_set_header Host $host; }
    location /health { proxy_pass http://127.0.0.1:3201; proxy_set_header Host $host; }
    location / {
        proxy_pass http://127.0.0.1:3200;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
cat > /etc/nginx/sites-available/imgurl     # paste the block above
ln -sf /etc/nginx/sites-available/imgurl /etc/nginx/sites-enabled/imgurl
nginx -t && systemctl reload nginx
```

`nginx -t` failing means nothing reloaded — your other sites keep running.

### 7. HTTPS

**Caddy:** automatic. Watch it happen; look for `certificate obtained successfully`.

```bash
docker compose logs -f caddy
```

**nginx:** one command, run after the vhost answers on port 80:

```bash
certbot --nginx -d yourname.duckdns.org --redirect -m you@example.com
```

Then add HSTS, once HTTPS actually works:

```bash
sed -i '/X-Frame-Options/i\    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;' /etc/nginx/sites-available/imgurl
nginx -t && systemctl reload nginx
```

On distros where `certbot` crashes with `cannot import name 'appengine'` (Ubuntu
20.04/22.04 ship an old certbot against a newer pip `urllib3`), install it in a
virtualenv and call it by path:

```bash
apt install -y python3-venv
python3 -m venv /opt/certbot
/opt/certbot/bin/pip install -U pip certbot certbot-nginx
/opt/certbot/bin/certbot --nginx -d yourname.duckdns.org --redirect -m you@example.com
( crontab -l 2>/dev/null; echo '15 3 * * * /opt/certbot/bin/certbot renew --quiet --deploy-hook "systemctl reload nginx"' ) | crontab -
```

### 8. Verify

```bash
curl -s  https://yourname.duckdns.org/health      # {"ok":true,"mongo":"up"}
curl -sI https://yourname.duckdns.org | head -1   # HTTP/2 200
```

Then open the site and do these five checks — they cover what unit tests cannot:

1. Upload a small image. Open its link in a private window; it renders.
2. Upload a video **over 6 minutes**, play it, wait 6 minutes, seek to 00:05:00.
   It still plays — the presigned URL outlives a long session.
3. Delete the image. Its old link now returns 404, not 500.
4. Create an API key and run the curl from [API for bots](#api-for-bots). You get
   a working URL back.
5. Revoke that key and run the same curl. You get 401.

## Using the panel

Sign in at `https://<PUBLIC_HOST>` with `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

- **Upload** — drop files or pick them. Progress is shown per file; the finished
  link is highlighted, with a copy button.
- **Library** — every file as a contact sheet. Hover a tile for Copy link and
  Delete. Delete removes the row first, then the object, so a link never points
  at something half-deleted.
- **API** — create a key, name it after the bot that will use it. The raw key is
  shown **once**; it is stored only as a SHA-256 hash.
- **Developers** — the live endpoint with copy-paste examples in cURL, Python,
  Node and PHP. The base URL comes from the request, so it is correct for
  whatever hostname you deployed on.

## API for bots

One endpoint. Create a key on the **API** page first.

```bash
curl -H "Authorization: Bearer ik_..." \
     -F "file=@photo.png" \
     https://yourname.duckdns.org/api/v1/files
```

```json
{ "id": "AbC123xYz9", "url": "https://yourname.duckdns.org/f/AbC123xYz9",
  "kind": "image", "mime": "image/png", "size": 48213, "name": "photo.png",
  "views": 0, "createdAt": "2026-11-25T10:00:00.000Z" }
```

Upload and link are the same call — there is no separate "create link" step.
Images and video use the same field and the same endpoint.

| Limit | Value |
|---|---|
| File size | 50 MB (`MAX_UPLOAD_MB`) |
| Uploads | 30 per minute per key |
| Accepted types | images and video, decided by the file's bytes |
| Key auth | `Authorization: Bearer ik_...` |

Bots can only upload. Listing and deleting require the admin session.

## Costs and limits

- **B2 free egress is 3× your stored data per month**, then $0.01/GB. Every full
  view of a video counts: a 40 MB clip watched 100 times is 4 GB. Free egress
  through Cloudflare is possible, but this project does not require it.
- B2 storage is $6.95/TB/month; the first 10 GB are free.
- MongoDB Atlas M0 is free and pauses after 60 days without activity — a personal
  host used occasionally will hit that. The bundled container never pauses.
- Caddy, MongoDB and Next.js need roughly 512 MB–1 GB of RAM together.
- The B2 redirect is signed for **12 hours**. Browsers follow the 302 once and
  keep using that URL for range requests, so long videos keep seeking. Re-opening
  the share link always mints a fresh one.

## Operating it

```bash
docker compose logs -f api          # or caddy, web, mongo
docker compose restart api
docker compose down                 # stop, keep data
docker compose up -d                # start again
docker compose stop mongo           # when the database is Atlas
```

**Update:**

```bash
cd /opt/imgurl
git pull
docker compose up -d --build
```

Changed `.env`? `docker compose up -d` re-creates the affected containers; no
rebuild needed.

**Backup.** B2 already holds the bytes; back up the metadata.

Bundled container:

```bash
docker compose exec -T mongo mongodump --archive --gzip > imgurl-$(date +%F).gz
gunzip -c imgurl-2026-11-25.gz | docker compose exec -T mongo mongorestore --archive --gzip
```

Atlas — through the same image, nothing to install:

```bash
docker run --rm -e URI="$MONGODB_URI" mongo:7 \
  sh -c 'mongodump --uri="$URI" --archive --gzip' > imgurl-$(date +%F).gz
```

Losing MongoDB loses the index, not the files: the objects stay in B2, but the
links and their ids are gone.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `acme: could not get certificate` | DNS not pointing here, or port 80 blocked | `dig +short <host>`, `ufw allow 80`, `docker compose restart caddy` |
| Service starts, then exits immediately | a config value was rejected | `docker compose logs api` — the first line names the variable |
| `Config error: ADMIN_PASSWORD must be at least 8 characters` | password too short | set 8–15 characters |
| `Config error: ... is still the example value` | `.env` still has `changeme123` or the example secret | replace both |
| `MongooseServerSelectionError` | Atlas URI, but the IP is not allowlisted | Atlas → Network Access → add the server IP |
| `502 Bad Gateway` | the API container stopped | `docker compose logs api` |
| Upload returns `503 All N storage account(s) failed` | wrong keyID, appKey or bucket | the panel shows B2's reply; recheck the key's bucket and capabilities |
| Upload returns `413` from **nginx** before the app sees it | `client_max_body_size` missing | add `client_max_body_size 55m;` to the vhost |
| Upload returns `413` from the app | file over `MAX_UPLOAD_MB` | raise the limit, `docker compose up -d` |
| Login returns 401 with the right password | password or `SESSION_SECRET` changed | sign in again; old cookies are invalidated on purpose |
| An old link 404s | its bucket was removed from `B2_ACCOUNTS` | put the entry back exactly as it was |
| `port is already allocated` | another web server owns 80/443 | use the [nginx override](#behind-an-existing-proxy-instead-of-caddy), or stop the other server |
| Build fails with `npm ci` / `Missing: <pkg> from lock file` | a dependency was added but the app's own lock was not updated | `sh scripts/sync-lock.sh`, commit, rebuild |
| `certbot` crashes with `cannot import name 'appengine'` | old apt certbot against a newer pip `urllib3` | install it in a venv, see [HTTPS](#7-https) |

## Security

- One admin account from env. The password is never stored; the comparison is
  timing-safe, and the session cookie carries a fingerprint of the current
  password, so changing `ADMIN_PASSWORD` or `SESSION_SECRET` logs out every
  existing session. The cookie is HttpOnly, SameSite=Lax and `Secure` in
  production.
- Login is limited to 5 requests per minute per IP; bot uploads to 30 per minute
  per key.
- Uploads are validated by magic bytes, not by name or client header. Only image
  and video types the server can name are accepted, so SVG (which can carry
  script) and TIFF are rejected.
- Buckets stay private. Public links are 302s to short-lived presigned URLs.
- Files are served from Backblaze's domain, never from your origin.
- Session tokens are pinned to HS256, so a forged `alg: none` token is rejected
  before the signature is considered.
- **Caddy** sends HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`, a
  referrer policy and a permissions policy, strips `Server` and `X-Powered-By`,
  and sends a deny-all CSP on `/api/*` and `/f/*`.
- **nginx** needs those headers in its own vhost (they are in the block above,
  minus HSTS which step 7 adds). MongoDB and the API are never published
  publicly — only the proxy listens.
- Rotate `SESSION_SECRET` to end all sessions at once. Rotate a B2 key in the B2
  dashboard if it leaks; nothing in the app needs to change except `B2_ACCOUNTS`.

## Local development

```bash
npm install
cp .env.example .env          # point MONGODB_URI at any MongoDB
npm --workspace apps/api run start:dev
npm --workspace apps/web run dev
```

The web app rewrites `/api/*` and `/f/*` to `http://localhost:3001`, so the
browser only ever talks to one origin and cookies work unchanged.

After adding or removing a dependency, run `sh scripts/sync-lock.sh` and commit
the lock it touches. Each Docker image installs from its own
`apps/*/package-lock.json`, which `npm install` at the workspace root does not
update.

## Tests

```bash
npm --workspace apps/api test            # 30 unit: config, mime sniffing, storage, keys, rate limit
npm --workspace apps/api run test:e2e    # 18 end-to-end against in-memory Mongo and a fake B2
npm --workspace apps/web run build       # type-check and production build
npm --workspace apps/web run test:smoke  # boots the built server against a stub API
```

`test:smoke` needs the web build first. It starts the real standalone server,
points it at a stub API that always returns 401, and checks the login page renders
and `/admin` redirects away.

The end-to-end suite covers login, cookie auth, upload, magic-byte rejection, the
413 cap, the public redirect, view counting, pagination and its total, delete, API
keys and revocation.

## License

MIT
