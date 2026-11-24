'use client';

import { animate } from 'animejs';
import { useEffect, useRef, useState } from 'react';
import { copyText } from '@/lib/api';
import { reducedMotion } from '@/lib/motion';

const LANGS = [
  { id: 'curl', label: 'cURL', file: 'upload.sh' },
  { id: 'python', label: 'Python', file: 'upload.py' },
  { id: 'node', label: 'Node.js', file: 'upload.mjs' },
  { id: 'php', label: 'PHP', file: 'upload.php' },
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
  const [urlCopied, setUrlCopied] = useState(false);
  const ink = useRef<HTMLSpanElement>(null);
  const code = useRef<HTMLPreElement>(null);
  const copyButton = useRef<HTMLButtonElement>(null);
  const tabs = useRef<Partial<Record<Lang, HTMLButtonElement | null>>>({});
  const mounted = useRef(false);

  const endpoint = `${origin}/api/v1/files`;
  const active = LANGS.find((item) => item.id === lang) ?? LANGS[0];
  const snippet = snippets(endpoint)[lang];

  useEffect(() => {
    const button = tabs.current[lang];
    const bar = ink.current;
    if (!button || !bar) return;

    const left = `${button.offsetLeft}px`;
    const width = `${button.offsetWidth}px`;

    if (!mounted.current || reducedMotion()) {
      bar.style.left = left;
      bar.style.width = width;
      mounted.current = true;
      return;
    }

    animate(bar, { left, width, duration: 280, ease: 'outQuad' });
    if (code.current) {
      animate(code.current, { opacity: [0.35, 1], translateY: [3, 0], duration: 240, ease: 'outQuad' });
    }
  }, [lang]);

  async function copy() {
    if (!(await copyText(snippet))) return;
    setCopied(true);
    if (copyButton.current && !reducedMotion()) {
      animate(copyButton.current, { scale: [1, 1.06, 1], duration: 260, ease: 'inOutQuad' });
    }
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function copyEndpoint() {
    if (!(await copyText(endpoint))) return;
    setUrlCopied(true);
    window.setTimeout(() => setUrlCopied(false), 1600);
  }

  return (
    <div className="docs">
      <div className="field">
        <span>API base URL</span>
        <div className="endpoint">
          <code>{endpoint}</code>
          <button className="btn" type="button" onClick={() => void copyEndpoint()}>
            {urlCopied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="Example language">
        {LANGS.map((item) => (
          <button
            key={item.id}
            ref={(element) => {
              tabs.current[item.id] = element;
            }}
            type="button"
            role="tab"
            className="tab"
            aria-selected={lang === item.id}
            aria-controls="api-example"
            onClick={() => setLang(item.id)}
          >
            {item.label}
          </button>
        ))}
        <span ref={ink} className="tab-ink" aria-hidden="true" />
      </div>

      <div className="code">
        <div className="code-head">
          <span className="code-file">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m8 6-6 6 6 6M16 6l6 6-6 6" />
            </svg>
            {active.file}
          </span>

          <button
            ref={copyButton}
            className="code-copy"
            type="button"
            onClick={() => void copy()}
            data-copied={copied}
            aria-label={copied ? 'Copied' : `Copy ${active.label} example`}
          >
            {copied ? (
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="9" width="12" height="12" rx="2" />
                <path d="M5 15V5a2 2 0 0 1 2-2h10" />
              </svg>
            )}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <pre ref={code} id="api-example" role="tabpanel" tabIndex={0} aria-label={`${active.label} upload example`}>
          <code>{snippet}</code>
        </pre>
      </div>

      <p className="docs-note">
        The key goes in <code>IMGURL_KEY</code>. Create one above — it is shown once.
        Limit is 50&nbsp;MB per file and 30 uploads a minute per key.
      </p>
    </div>
  );
}
