'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { ActivitySquare, Boxes, LayoutDashboard, UploadCloud, Settings, PenSquare } from 'lucide-react';
import { cn } from './ui';

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: Boxes },
  { href: '/viewer', label: 'PDF Viewer', icon: PenSquare },
  { href: '/upload', label: 'Upload', icon: UploadCloud },
  { href: '/settings', label: 'Settings', icon: Settings }
];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-shell">
      <aside className="sidebar glass">
        <div className="brand">
          <div className="brand-mark">P</div>
          <div>
            <div className="eyebrow">Prewire Plans</div>
            <div className="muted">collaborative plan review</div>
          </div>
        </div>
        <nav className="nav">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={cn('nav-item', active && 'active')}>
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="badge"><ActivitySquare size={14} /> live sync</div>
          <p>Dark, minimal, and fast enough for field reviews.</p>
        </div>
      </aside>
      <main className="workspace">
        <header className="topbar glass">
          <div>
            <div className="eyebrow">Apple-inspired workspace</div>
            <h1>Prewire Plans</h1>
          </div>
          <div className="topbar-actions">
            <Link href="/upload" className="btn btn-primary">Upload PDF</Link>
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
      <nav className="mobile-nav glass">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={cn('mobile-nav-item', active && 'active')}>
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
