'use client';

import { useEffect, useState } from 'react';
import { absoluteUrl, copyText, deleteFile, formatBytes, listFiles, type FileItem } from '@/lib/api';

function day(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function FileList() {
  const [items, setItems] = useState<FileItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load(next?: string) {
    setLoading(true);
    setError('');
    try {
      const page = await listFiles(next);
      setItems((prev) => (next ? [...prev, ...page.items] : page.items));
      setCursor(page.next ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load files.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // Runs once; "Load more" drives later pages.
  }, []);

  async function copy(url: string) {
    setError('');
    setMessage((await copyText(absoluteUrl(url))) ? 'Link copied.' : '');
  }

  async function remove(item: FileItem) {
    if (!window.confirm(`Delete ${item.name}? This cannot be undone.`)) return;
    setError('');
    try {
      await deleteFile(item.id);
      setItems((prev) => prev.filter((row) => row.id !== item.id));
      setMessage(`Deleted ${item.name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete file.');
    }
  }

  return (
    <section className="card">
      <h2>Library</h2>

      {!loading && items.length === 0 && !error && (
        <p className="muted">No files yet. Upload something above.</p>
      )}

      <div className="list">
        {items.map((item) => (
          <div className="row" key={item.id}>
            {item.kind === 'image' ? (
              <img className="thumb" src={item.url} alt="" loading="lazy" />
            ) : (
              <video className="thumb" src={item.url} controls preload="metadata" />
            )}

            <div className="grow">
              <div className="name" title={item.name}>
                {item.name}
              </div>
              <div className="meta">
                <span>{item.kind}</span>
                <span>{formatBytes(item.size)}</span>
                <span>{item.views} views</span>
                <time dateTime={item.createdAt}>{day(item.createdAt)}</time>
              </div>
            </div>

            <div className="row">
              <button className="btn" type="button" onClick={() => void copy(item.url)}>
                Copy link
              </button>
              <button className="btn btn-danger" type="button" onClick={() => void remove(item)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {cursor && (
        <button className="btn" type="button" disabled={loading} onClick={() => void load(cursor)}>
          {loading ? 'Loading...' : 'Load more'}
        </button>
      )}

      <p className="status" aria-live="polite">
        {error ? <span className="error">{error}</span> : loading && items.length === 0 ? 'Loading files...' : message}
      </p>
    </section>
  );
}
