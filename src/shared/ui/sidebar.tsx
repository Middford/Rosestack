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
  Users,
  Building2,
  AlertTriangle,
  Boxes,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/hardware', label: 'Hardware', icon: Battery },
  { href: '/tariffs', label: 'Tariffs', icon: Zap },
  { href: '/finance', label: 'Finance', icon: PoundSterling },
  { href: '/grid', label: 'Grid', icon: Map },
  { href: '/strategy', label: 'Strategy', icon: Lightbulb },
  { href: '/funding', label: 'Funding', icon: Landmark },
  { href: '/legal', label: 'Legal', icon: Shield },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/portfolio', label: 'Portfolio', icon: Building2 },
  { href: '/risk', label: 'Risk & Opps', icon: AlertTriangle },
  { href: '/product-design', label: 'Product Design', icon: Boxes },
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
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-colors duration-150',
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
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-6 py-4">
        <p className="text-[10px] text-text-tertiary">v0.1.0 — Phase 1</p>
      </div>
    </aside>
  );
}
