'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import ThemeToggle from '../theme-toggle';
import Uploader from './uploader';
import FileList from './file-list';
import Keys from './keys';

export default function Panel({ email, apiOrigin }: { email: string; apiOrigin: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Cookie may still be valid; the guard on next visit will re-check.
    }
    router.replace('/');
    router.refresh();
  }

  return (
    <>
      <header className="bar">
        <span className="wordmark">imgurl</span>
        <span className="spacer" />
        <span className="identity">{email}</span>
        <ThemeToggle />
        <button className="btn-quiet" type="button" onClick={logout} disabled={pending}>
          {pending ? 'Signing out' : 'Log out'}
        </button>
      </header>

      <main className="wrap">
        <Uploader />
        <FileList />
        <Keys apiOrigin={apiOrigin} />
      </main>
    </>
  );
}
