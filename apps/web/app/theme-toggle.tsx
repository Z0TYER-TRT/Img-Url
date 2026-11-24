'use client';

import { animate } from 'animejs';
import { useEffect, useRef, useState } from 'react';
import { reducedMotion } from '@/lib/motion';

const STORAGE_KEY = 'imgurl-theme';
type Theme = 'light' | 'dark';

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private mode: the choice just will not persist.
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);
  const icon = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
    setMounted(true);
  }, []);

  function toggle(event: React.MouseEvent<HTMLButtonElement>) {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);

    if (icon.current && !reducedMotion()) {
      animate(icon.current, { rotate: next === 'dark' ? 180 : 0, duration: 460, ease: 'outQuad' });
    }

    if (reducedMotion()) {
      apply(next);
      return;
    }

    // Organic reveal: a circle grows from the button, the theme swaps behind it.
    const x = event.clientX;
    const y = event.clientY;
    const size = 2 * Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const overlay = document.createElement('div');
    overlay.className = `theme-reveal ${next}`;
    overlay.style.width = `${size}px`;
    overlay.style.height = `${size}px`;
    overlay.style.left = `${x - size / 2}px`;
    overlay.style.top = `${y - size / 2}px`;
    document.body.appendChild(overlay);

    animate(overlay, {
      scale: [0, 1],
      duration: 420,
      ease: 'outQuad',
      onComplete: () => {
        apply(next);
        animate(overlay, {
          opacity: [1, 0],
          duration: 240,
          ease: 'linear',
          onComplete: () => overlay.remove(),
        });
      },
    });
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-pressed={theme === 'dark'}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      // Nothing is clickable before hydration anyway; keep the icon stable.
      data-ready={mounted}
    >
      <svg ref={icon} viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
        <g className="icon-sun" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <circle cx="12" cy="12" r="4.1" />
          <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" />
        </g>
        <path
          className="icon-moon"
          d="M20 14.4A8 8 0 1 1 9.6 4a6.4 6.4 0 0 0 10.4 10.4Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
