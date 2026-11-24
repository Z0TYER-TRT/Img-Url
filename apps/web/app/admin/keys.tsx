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
    if (!window.confirm(`Delete key "${item.name}"? Apps using it stop working.`)) return;
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
    <section className="section">
      <h2>API keys</h2>

      <div>
        {!loading && items.length === 0 && (
          <p className="muted">No keys yet. Make one for a bot that uploads.</p>
        )}

        {items.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="keys">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Key</th>
                  <th>Created</th>
                  <th>Last used</th>
                  <th className="right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>
                      <code>{item.prefix}…</code>
                    </td>
                    <td>{day(item.createdAt)}</td>
                    <td>{day(item.lastUsedAt)}</td>
                    <td className="right">
                      <button
                        className="btn-quiet"
                        type="button"
                        onClick={() => void remove(item)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <form className="form-row" onSubmit={onCreate}>
          <label className="field">
            <span>Name for the new key</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="discord-bot"
              disabled={pending}
            />
          </label>
          <button className="btn btn-mark" type="submit" disabled={pending || !name.trim()}>
            {pending ? 'Creating' : 'Create key'}
          </button>
        </form>

        {created && (
          <div className="mark-box">
            <p>Copy it now. It is not shown again.</p>
            <div className="link-row">
              <label className="sr-only" htmlFor="new-key">
                New API key
              </label>
              <input
                id="new-key"
                readOnly
                value={created.key}
                style={{ background: 'var(--paper)' }}
                onFocus={(event) => event.currentTarget.select()}
              />
              <button className="btn" type="button" onClick={() => void onCopy()}>
                Copy
              </button>
            </div>
          </div>
        )}

        <p className="status" aria-live="polite">
          {error ? <span className="error">{error}</span> : message}
        </p>
      </div>
    </section>
  );
}
