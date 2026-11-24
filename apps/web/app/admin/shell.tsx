'use client';

import { useEffect, useState } from 'react';
import Sidebar from './sidebar';

export default function Shell({ email, children }: { email: string; children: React.ReactNode }) {
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
      <main className="content">{children}</main>
    </div>
  );
}
