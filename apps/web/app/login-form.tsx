'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { errorText } from '@/lib/api';

export default function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const data = new FormData(event.currentTarget);
    setPending(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: data.get('email'), password: data.get('password') }),
      });

      if (res.ok) {
        router.replace('/admin');
        router.refresh();
        return;
      }

      const body = await res.json().catch(() => null);
      setError(
        res.status === 429
          ? errorText(body, 'Too many attempts. Try again in a minute.')
          : 'Invalid email or password.',
      );
    } catch {
      setError('Could not reach the server. Try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      <label className="field">
        <span>Email</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          autoFocus
          required
          disabled={pending}
        />
      </label>

      <label className="field">
        <span>Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
        />
      </label>

      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? 'Signing in...' : 'Sign in'}
      </button>

      <p className="status" aria-live="polite">
        <span className="error">{error}</span>
      </p>
    </form>
  );
}
