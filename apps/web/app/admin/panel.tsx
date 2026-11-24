'use client';

import { useEffect, useState } from 'react';
import Sidebar from './sidebar';
import Uploader from './uploader';
import FileList from './file-list';
import Keys from './keys';

export default function Panel({ email, apiOrigin }: { email: string; apiOrigin: string }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem('imgurl-rail') === '1');
    } catch {
      // Storage blocked: the rail just starts expanded.
    }
  }, []);

  function toggle() {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem('imgurl-rail', next ? '1' : '0');
      } catch {
        // Ignore: the choice lasts for this page view.
      }
      return next;
    });
  }

  return (
    <div className="shell" data-collapsed={collapsed ? 'true' : 'false'}>
      <Sidebar email={email} collapsed={collapsed} onToggle={toggle} />

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
