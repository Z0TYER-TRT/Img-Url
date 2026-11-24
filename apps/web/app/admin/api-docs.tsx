'use client';

import { useState } from 'react';
import { copyText } from '@/lib/api';

const LANGS = [
  { id: 'curl', label: 'cURL' },
  { id: 'python', label: 'Python' },
  { id: 'node', label: 'Node.js' },
  { id: 'php', label: 'PHP' },
] as const;

type Lang = (typeof LANGS)[number]['id'];

function snippets(endpoint: string): Record<Lang, string> {
  return {
    curl: `curl -H "Authorization: Bearer $IMGURL_KEY" \\
  -F "file=@photo.png" \\
  ${endpoint}`,

    python: `# pip install requests
import os, requests

with open("photo.png", "rb") as f:
    res = requests.post(
        "${endpoint}",
        headers={"Authorization": f"Bearer {os.environ['IMGURL_KEY']}"},
        files={"file": f},
        timeout=60,
    )

res.raise_for_status()
print(res.json()["url"])`,

    node: `// save as upload.mjs — Node 18+
import fs from 'node:fs';

const body = new FormData();
body.append('file', new Blob([fs.readFileSync('photo.png')]), 'photo.png');

const res = await fetch('${endpoint}', {
  method: 'POST',
  headers: { Authorization: \`Bearer \${process.env.IMGURL_KEY}\` },
  body,
});

console.log((await res.json()).url);`,

    php: `<?php
$ch = curl_init('${endpoint}');
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . getenv('IMGURL_KEY')],
    CURLOPT_POSTFIELDS     => ['file' => new CURLFile('photo.png')],
]);

echo json_decode(curl_exec($ch), true)['url'];`,
  };
}

export default function ApiDocs({ origin }: { origin: string }) {
  const [lang, setLang] = useState<Lang>('curl');
  const [copied, setCopied] = useState(false);
  const endpoint = `${origin}/api/v1/files`;
  const code = snippets(endpoint)[lang];

  async function copy() {
    if (await copyText(code)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  }

  return (
    <div className="docs">
      <div className="docs-head">
        <h3>From your bot</h3>
        <span className="muted">Send the file, get the link back. Same call for images and video.</span>
      </div>

      <label className="field" style={{ marginTop: 12 }}>
        <span>API base URL</span>
        <input readOnly value={endpoint} onFocus={(event) => event.currentTarget.select()} />
      </label>

      <div className="docs-bar">
        <div className="tabs" role="tablist" aria-label="Example language">
          {LANGS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              className="tab"
              aria-selected={lang === item.id}
              onClick={() => setLang(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <button className="btn" type="button" onClick={() => void copy()}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <pre className="code" tabIndex={0} aria-label={`${lang} upload example`}>
        <code>{code}</code>
      </pre>

      <p className="docs-note">
        The key goes in <code>IMGURL_KEY</code>. Create one above — it is shown once.
        Limit is 50&nbsp;MB per file and 30 uploads a minute per key.
      </p>
    </div>
  );
}
