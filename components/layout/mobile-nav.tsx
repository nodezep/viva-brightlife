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
  Wallet
} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {usePathname, Link} from '@/lib/navigation';
import {navItems} from '@/lib/constants';
import {cn} from '@/lib/utils';

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

export function MobileNav() {
  const t = useTranslations('navigation');
  const pathname = usePathname();

  return (
    <nav className="no-print fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur lg:hidden">
      <div className="flex gap-2 overflow-x-auto px-3 py-2">
        {navItems.map((item) => {
          const Icon = iconMap[item.icon as keyof typeof iconMap];
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-w-[96px] flex-col items-center gap-1 rounded-lg px-3 py-2 text-[11px] font-semibold transition-colors',
                active ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground'
              )}
            >
              <Icon size={16} />
              <span className="whitespace-nowrap">{t(item.key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
