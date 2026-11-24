// Boots the built Next.js standalone server against a stub API and checks the
// two real behaviours the UI cannot show in a type check: the login page renders
// and /admin redirects away when the API says 401.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import http from 'node:http';
import { dirname, join } from 'node:path';

const WEB_PORT = 3998;
const API_PORT = 3999;
const API = `http://127.0.0.1:${API_PORT}`;

function findServer() {
  const candidates = [
    '.next/standalone/server.js',
    '.next/standalone/apps/web/server.js',
  ];
  const found = candidates.find((path) => existsSync(path));
  if (!found) throw new Error('No standalone build. Run `npm run build` first.');
  return found;
}

async function waitFor(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.status < 500) return res;
    } catch {
      // server not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Server did not answer within ${timeoutMs}ms`);
}

const serverPath = findServer();
const stub = http.createServer((_req, res) => {
  res.writeHead(401, { 'content-type': 'application/json' });
  res.end('{"message":"Unauthorized"}');
});
await new Promise((resolve) => stub.listen(API_PORT, '127.0.0.1', resolve));

const child = spawn(process.execPath, [join(process.cwd(), serverPath)], {
  cwd: dirname(join(process.cwd(), serverPath)),
  env: { ...process.env, NODE_ENV: 'production', PORT: String(WEB_PORT), HOSTNAME: '127.0.0.1', API_URL: API },
  stdio: 'ignore',
});

let failed = false;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail && !ok ? ` — ${detail}` : ''}`);
  if (!ok) failed = true;
};

try {
  const home = await waitFor(`http://127.0.0.1:${WEB_PORT}/`);
  const body = await home.text();
  check('login page returns 200', home.status === 200, `status ${home.status}`);
  check('login page renders the sign-in heading', body.includes('<h1>Sign in</h1>'));

  const admin = await waitFor(`http://127.0.0.1:${WEB_PORT}/admin`);
  check('admin redirects when unauthenticated', admin.status >= 300 && admin.status < 400, `status ${admin.status}`);
} catch (error) {
  check('smoke run', false, error.message);
} finally {
  child.kill();
  stub.close();
}

process.exit(failed ? 1 : 0);
