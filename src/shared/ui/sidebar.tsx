'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from './utils';
import {
  LayoutDashboard,
  Battery,
  Zap,
  PoundSterling,
  Map,
  Lightbulb,
  Landmark,
  Shield,
  Building2,
  AlertTriangle,
  Boxes,
  GitBranch,
  Wrench,
} from 'lucide-react';

interface NavSection {
  title?: string;
  items: { href: string; label: string; icon: typeof LayoutDashboard }[];
}

const navSections: NavSection[] = [
  // Top level
  {
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  // Business Tracking — day-to-day operations
  {
    title: 'Operations',
    items: [
      { href: '/grid', label: 'Grid', icon: Map },
      { href: '/pipeline', label: 'Pipeline', icon: GitBranch },
      { href: '/projects', label: 'Projects', icon: Building2 },
    ],
  },
  // Business Planning — strategy and research
  {
    title: 'Planning',
    items: [
      { href: '/strategy', label: 'Strategy', icon: Lightbulb },
      { href: '/hardware', label: 'Hardware', icon: Battery },
      { href: '/tariffs', label: 'Tariffs', icon: Zap },
      { href: '/funding', label: 'Funding', icon: Landmark },
      { href: '/legal', label: 'Legal', icon: Shield },
      { href: '/risk', label: 'Risk & Opps', icon: AlertTriangle },
    ],
  },
  // Future Plans
  {
    title: 'Future',
    items: [
      { href: '/product-design', label: 'Product Design', icon: Boxes },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border bg-bg-secondary">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose">
          <span className="text-lg font-bold text-white">R</span>
        </div>
        <div>
          <h1 className="text-sm font-bold text-text-primary">RoseStack</h1>
          <p className="text-[10px] text-text-tertiary">Energy Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navSections.map((section, si) => (
          <div key={si} className={si > 0 ? 'mt-5' : ''}>
            {section.title && (
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors duration-150',
                        isActive
                          ? 'bg-rose-subtle text-rose-light'
                          : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-6 py-4">
        <p className="text-[10px] text-text-tertiary">v0.2.0 — Phase 2</p>
      </div>
    </aside>
  );
}
