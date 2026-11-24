'use client';

import { useEffect, useState } from 'react';
import { absoluteUrl, copyText, deleteFile, formatBytes, listFiles, type FileItem } from '@/lib/api';
import { collapse } from '@/lib/motion';

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

  async function remove(item: FileItem, button: HTMLElement) {
    if (!window.confirm(`Delete ${item.name}? The link stops working and cannot be restored.`)) return;
    setError('');
    try {
      await deleteFile(item.id);
      setMessage(`Deleted ${item.name}.`);
      window.dispatchEvent(new Event('imgurl:changed'));
      collapse(button.closest('.tile'), () =>
        setItems((prev) => prev.filter((row) => row.id !== item.id)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete file.');
    }
  }

  return (
    <section className="section" id="library">
      <h2>Library</h2>

      <div>
        {!loading && items.length === 0 && !error && (
          <div>
            <p className="empty">Nothing here yet.</p>
            <p>Files you upload appear here with their links.</p>
          </div>
        )}

        {items.length > 0 && (
          <div className="sheet">
            {items.map((item) => (
              <figure className="tile" key={item.id}>
                <div className="frame">
                  {item.kind === 'image' ? (
                    <img src={item.url} alt="" loading="lazy" />
                  ) : (
                    <video src={item.url} controls preload="metadata" />
                  )}

                  <div className="tile-actions">
                    <button className="chip" type="button" onClick={() => void copy(item.url)}>
                      Copy link
                    </button>
                    <button
                      className="chip chip-danger"
                      type="button"
                      onClick={(event) => void remove(item, event.currentTarget)}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <figcaption className="caption">
                  <span className="name" title={item.name}>
                    {item.name}
                  </span>
                  <span className="meta">
                    <span>{formatBytes(item.size)}</span>
                    <span>{item.views} views</span>
                    <time dateTime={item.createdAt}>{day(item.createdAt)}</time>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        )}

        {cursor && (
          <div className="more">
            <button className="btn" type="button" disabled={loading} onClick={() => void load(cursor)}>
              {loading ? 'Loading' : 'Load more'}
            </button>
          </div>
        )}

        <p className="status" aria-live="polite">
          {error ? (
            <span className="error">{error}</span>
          ) : loading && items.length === 0 ? (
            'Loading files'
          ) : (
            message
          )}
        </p>
      </div>
    </section>
  );
}
