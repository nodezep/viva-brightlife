'use client';

import {
  Bike,
  Briefcase,
  FileSpreadsheet,
  HandHeart,
  LayoutDashboard,
  MessageSquare,
  ShieldCheck,
  Sprout,
  Tv,
  Users2,
  Wallet,
  X
} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {usePathname, Link} from '@/lib/navigation';
import {cn} from '@/lib/utils';
import {navItems} from '@/lib/constants';

const iconMap = {
  LayoutDashboard,
  Wallet,
  Briefcase,
  Users2,
  Tv,
  Sprout,
  ShieldCheck,
  HandHeart,
  Bike,
  FileSpreadsheet,
  MessageSquare
};

type Props = {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
};

export function Sidebar({open, collapsed, onClose}: Props) {
  const t = useTranslations('navigation');
  const pathname = usePathname();

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-30 bg-black/40 transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          'no-print fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] border-r bg-card transition-transform lg:translate-x-0',
          collapsed ? 'w-16 lg:w-16' : 'w-72 lg:w-72',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-end p-3 lg:hidden">
          <button type="button" onClick={onClose} className="rounded-md border p-1.5">
            <X size={16} />
          </button>
        </div>
        <nav className="space-y-1 px-3 pb-6">
          {navItems.map((item) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap];
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={t(item.key)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                  collapsed ? 'justify-center px-2' : '',
                  active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                )}
                onClick={onClose}
              >
                <Icon size={16} />
                <span className={collapsed ? 'hidden' : ''}>{t(item.key)}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
