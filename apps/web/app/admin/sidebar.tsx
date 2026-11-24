'use client';

import {
  Code2,
  Images,
  KeyRound,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  UploadCloud,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { listFiles } from '@/lib/api';
import ThemeToggle from '../theme-toggle';

type Page = { href: string; label: string; icon: LucideIcon; badge?: boolean };

const GROUPS: Array<{ heading?: string; items: Page[] }> = [
  {
    items: [
      { href: '/admin', label: 'Upload', icon: UploadCloud },
      { href: '/admin/library', label: 'Library', icon: Images, badge: true },
    ],
  },
  {
    heading: 'Manage',
    items: [{ href: '/admin/keys', label: 'API', icon: KeyRound }],
  },
  {
    heading: 'Developers',
    items: [{ href: '/admin/developers', label: 'Developers', icon: Code2 }],
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
  const pathname = usePathname();
  const [total, setTotal] = useState<number | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);

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
          id: `go-${item.href}`,
          label: `Go to ${item.label}`,
          hint: 'Page',
          run: () => router.push(item.href),
        })),
      ),
      {
        id: 'logout',
        label: 'Log out',
        hint: 'Session',
        run: () => void logout(),
      },
    ],
    // Command list is static; logout/router are stable enough for this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const matches = commands.filter((command) =>
    command.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

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

  // Navigating away closes any open palette.
  useEffect(() => {
    setPaletteOpen(false);
    setQuery('');
  }, [pathname]);

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
          <Link href="/admin" className="wordmark">
            imgurl
          </Link>
          <button
            className="icon-btn rail-toggle"
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelLeftOpen size={16} strokeWidth={1.6} />
            ) : (
              <PanelLeftClose size={16} strokeWidth={1.6} />
            )}
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

        <nav className="rail-nav" aria-label="Pages">
          {GROUPS.map((group, index) => (
            <div className="rail-group" key={group.heading ?? `group-${index}`}>
              {group.heading && <span className="rail-group-heading">{group.heading}</span>}
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rail-link"
                    aria-current={active ? 'page' : undefined}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon size={16} strokeWidth={1.6} />
                    <span className="nav-label">{item.label}</span>
                    {item.badge && total !== null && <span className="nav-badge">{total}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="rail-foot">
          <span className="identity">{email}</span>
          <div className="rail-actions">
            <ThemeToggle />
            <button
              className="rail-link rail-logout"
              type="button"
              onClick={() => void logout()}
              aria-label="Log out"
              title={collapsed ? 'Log out' : undefined}
            >
              <LogOut size={16} strokeWidth={1.6} />
              <span className="nav-label">Log out</span>
            </button>
          </div>
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
                placeholder="Jump to a page"
                aria-label="Search pages"
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
