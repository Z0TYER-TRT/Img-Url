'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { copyText, createKey, deleteKey, listKeys, type KeyItem } from '@/lib/api';

function day(iso: string | null) {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function Keys() {
  const [items, setItems] = useState<KeyItem[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<{ id: string; name: string; key: string } | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    listKeys()
      .then((page) => setItems(page.items))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || pending) return;

    setPending(true);
    setError('');
    setMessage('');
    try {
      const key = await createKey(name.trim());
      setCreated(key);
      setName('');
      setItems(await listKeys().then((page) => page.items));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create key.');
    } finally {
      setPending(false);
    }
  }

  async function onCopy() {
    if (!created) return;
    if (await copyText(created.key)) {
      setCreated(null);
      setMessage('API key copied.');
    }
  }

  async function remove(item: KeyItem) {
    if (!window.confirm(`Delete key "${item.name}"? Apps using it will stop working.`)) return;
    setError('');
    try {
      await deleteKey(item.id);
      setItems((prev) => prev.filter((key) => key.id !== item.id));
      setMessage(`Deleted key ${item.name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete key.');
    }
  }

  return (
    <section className="card">
      <h2>API keys</h2>

      <div className="list">
        {items.map((item) => (
          <div className="row" key={item.id}>
            <div className="grow">
              <div className="name">{item.name}</div>
              <div className="meta">
                <code>{item.prefix}...</code>
                <span>created {day(item.createdAt)}</span>
                <span>last used {day(item.lastUsedAt)}</span>
              </div>
            </div>
            <button className="btn btn-danger" type="button" onClick={() => void remove(item)}>
              Delete
            </button>
          </div>
        ))}
      </div>

      {!loading && items.length === 0 && (
        <p className="muted">No API keys yet.</p>
      )}

      <form className="row" onSubmit={onCreate}>
        <label className="field grow">
          <span>New key name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. sharex"
            disabled={pending}
          />
        </label>
        <button className="btn" type="submit" disabled={pending || !name.trim()}>
          {pending ? 'Creating...' : 'Create key'}
        </button>
      </form>

      {created && (
        <div className="key-warn">
          <p>
            Copy this now — it will not be shown again.
          </p>
          <div className="url-row">
            <label className="sr-only" htmlFor="new-key">
              New API key
            </label>
            <input
              id="new-key"
              readOnly
              value={created.key}
              onFocus={(event) => event.currentTarget.select()}
            />
            <button className="btn btn-primary" type="button" onClick={() => void onCopy()}>
              Copy
            </button>
          </div>
        </div>
      )}

      <p className="status" aria-live="polite">
        {error ? <span className="error">{error}</span> : message}
      </p>
    </section>
  );
}
