'use client';

import { useEffect, useState } from 'react';

const ITEMS = [
  { id: 'upload', label: 'Upload' },
  { id: 'library', label: 'Library' },
  { id: 'keys', label: 'API keys' },
  { id: 'api', label: 'API' },
];

export default function RailNav() {
  const [active, setActive] = useState('upload');

  useEffect(() => {
    const targets = ITEMS.map((item) => document.getElementById(item.id)).filter(
      (element): element is HTMLElement => Boolean(element),
    );

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-15% 0px -55% 0px', threshold: 0 },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  function go(id: string) {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }

  return (
    <nav className="rail-nav" aria-label="Sections">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className="rail-link"
          aria-current={active === item.id ? 'true' : undefined}
          onClick={() => go(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
