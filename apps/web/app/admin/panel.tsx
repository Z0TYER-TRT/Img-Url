'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import ThemeToggle from '../theme-toggle';
import Uploader from './uploader';
import FileList from './file-list';
import Keys from './keys';
import RailNav from './rail';

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
    <div className="shell">
      <aside className="rail">
        <span className="wordmark">imgurl</span>

        <RailNav />

        <div className="rail-foot">
          <span className="identity">{email}</span>
          <ThemeToggle />
          <button className="btn-quiet" type="button" onClick={logout} disabled={pending}>
            {pending ? 'Signing out' : 'Log out'}
          </button>
        </div>
      </aside>

      <main className="content">
        <div className="wrap">
          <Uploader />
          <FileList />
          <Keys apiOrigin={apiOrigin} />
        </div>
      </main>
    </div>
  );
}
