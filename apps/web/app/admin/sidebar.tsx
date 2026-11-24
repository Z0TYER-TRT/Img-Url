'use client';

import {
  Images,
  KeyRound,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Terminal,
  UploadCloud,
  type LucideIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { listFiles } from '@/lib/api';
import ThemeToggle from '../theme-toggle';

type Section = { id: string; label: string; icon: LucideIcon };

const GROUPS: Array<{ heading?: string; items: Section[] }> = [
  {
    items: [
      { id: 'upload', label: 'Upload', icon: UploadCloud },
      { id: 'library', label: 'Library', icon: Images },
    ],
  },
  {
    heading: 'Manage',
    items: [{ id: 'keys', label: 'API keys', icon: KeyRound }],
  },
  {
    heading: 'Developers',
    items: [{ id: 'api', label: 'API', icon: Terminal }],
  },
];

export default function Sidebar({
  email,
  collapsed,
  onToggle,
}: {
  email: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const [active, setActive] = useState('upload');
  const [total, setTotal] = useState<number | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);

  // Scroll-spy over the four sections.
  useEffect(() => {
    const targets = GROUPS.flatMap((group) => group.items)
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => Boolean(element));

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

  // Real library size for the badge, refreshed whenever the collection changes.
  useEffect(() => {
    const refresh = () => {
      listFiles(undefined, 1)
        .then((page) => setTotal(page.total ?? null))
        .catch(() => setTotal(null));
    };
    refresh();
    window.addEventListener('imgurl:changed', refresh);
    return () => window.removeEventListener('imgurl:changed', refresh);
  }, []);

  const commands = useMemo(
    () => [
      ...GROUPS.flatMap((group) =>
        group.items.map((item) => ({
          id: `go-${item.id}`,
          label: `Go to ${item.label}`,
          hint: 'Section',
          run: () => go(item.id),
        })),
      ),
      {
        id: 'pick',
        label: 'Choose files to upload',
        hint: 'Upload',
        run: () => {
          window.dispatchEvent(new Event('imgurl:pick'));
          document.getElementById('upload')?.scrollIntoView({ block: 'start' });
        },
      },
      {
        id: 'logout',
        label: 'Log out',
        hint: 'Session',
        run: () => void logout(),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const matches = commands.filter((command) =>
    command.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  // ⌘K / Ctrl+K anywhere, Escape closes.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        setQuery('');
        setCursor(0);
      }
      if (event.key === 'Escape') setPaletteOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function go(id: string) {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    setActive(id);
    setPaletteOpen(false);
  }

  function run(command: (typeof commands)[number]) {
    setPaletteOpen(false);
    setQuery('');
    command.run();
  }

  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // The admin guard re-checks on the next visit anyway.
    }
    router.replace('/');
    router.refresh();
  }

  function onPaletteKey(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((index) => Math.min(index + 1, matches.length - 1));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((index) => Math.max(index - 1, 0));
    }
    if (event.key === 'Enter' && matches[cursor]) run(matches[cursor]);
  }

  return (
    <>
      <aside className="rail">
        <div className="rail-head">
          <span className="wordmark">imgurl</span>
          <button
            className="icon-btn rail-toggle"
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={16} strokeWidth={1.6} /> : <PanelLeftClose size={16} strokeWidth={1.6} />}
          </button>
        </div>

        <button
          className="rail-search"
          type="button"
          onClick={() => setPaletteOpen(true)}
          title={collapsed ? 'Search (Ctrl K)' : undefined}
        >
          <Search size={15} strokeWidth={1.6} />
          <span className="nav-label">Search</span>
          <kbd className="nav-kbd">Ctrl K</kbd>
        </button>

        <nav className="rail-nav" aria-label="Sections">
          {GROUPS.map((group, index) => (
            <div className="rail-group" key={group.heading ?? `group-${index}`}>
              {group.heading && <span className="rail-group-heading">{group.heading}</span>}
              {group.items.map((item) => {
                const Icon = item.icon;
                const badge = item.id === 'library' && total !== null ? total : undefined;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="rail-link"
                    aria-current={active === item.id ? 'true' : undefined}
                    title={collapsed ? item.label : undefined}
                    onClick={() => go(item.id)}
                  >
                    <Icon size={16} strokeWidth={1.6} />
                    <span className="nav-label">{item.label}</span>
                    {badge !== undefined && <span className="nav-badge">{badge}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="rail-foot">
          <span className="identity">{email}</span>
          <ThemeToggle />
          <button className="icon-btn" type="button" onClick={() => void logout()} aria-label="Log out" title="Log out">
            <LogOut size={16} strokeWidth={1.6} />
          </button>
        </div>
      </aside>

      {paletteOpen && (
        <div className="cmdk" role="dialog" aria-modal="true" aria-label="Commands">
          <div className="cmdk-scrim" onClick={() => setPaletteOpen(false)} />
          <div className="cmdk-panel" onKeyDown={onPaletteKey}>
            <div className="cmdk-field">
              <Search size={16} strokeWidth={1.6} />
              <input
                autoFocus
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setCursor(0);
                }}
                placeholder="Jump to a section or run a command"
                aria-label="Search commands"
              />
              <kbd className="nav-kbd">Esc</kbd>
            </div>
            <div className="cmdk-list">
              {matches.length === 0 && <p className="cmdk-empty">Nothing matches that.</p>}
              {matches.map((command, index) => (
                <button
                  key={command.id}
                  type="button"
                  className="cmdk-item"
                  data-active={index === cursor}
                  onMouseEnter={() => setCursor(index)}
                  onClick={() => run(command)}
                >
                  <span>{command.label}</span>
                  <span className="cmdk-hint">{command.hint}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
