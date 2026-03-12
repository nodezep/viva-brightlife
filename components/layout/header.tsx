'use client';

import {Menu, PanelLeftClose, PanelLeftOpen, UserCircle2} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {LanguageToggle} from './language-toggle';
import {ThemeToggle} from './theme-toggle';
import {createClient} from '@/lib/supabase/client';
import {useRouter} from '@/lib/navigation';
import {BrandLogo} from './brand-logo';

type Props = {
  onToggleSidebar: () => void;
  onToggleCollapse: () => void;
  collapsed: boolean;
  adminEmail: string;
};

export function Header({onToggleSidebar, onToggleCollapse, collapsed, adminEmail}: Props) {
  const t = useTranslations();
  const router = useRouter();

  const onLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    await fetch('/api/auth/logout', {method: 'POST'});
    router.replace('/login');
    router.refresh();
  };

  return (
    <header className="no-print fixed left-0 right-0 top-0 z-40 border-b bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1800px] items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-lg border p-2 lg:hidden"
            onClick={onToggleSidebar}
            aria-label="toggle sidebar"
          >
            <Menu size={18} />
          </button>
          <button
            type="button"
            className="hidden rounded-lg border p-2 lg:inline-flex"
            onClick={onToggleCollapse}
            aria-label="toggle sidebar collapse"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <div>
            <div className="flex items-center gap-3">
              <BrandLogo size={40} />
              <div>
                <p className="text-sm font-semibold tracking-wide text-primary">{t('app.name')}</p>
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  {t('app.admin')}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <LanguageToggle />
          <ThemeToggle />
          <div className="rounded-lg border px-3 py-2 text-sm">
            <div className="flex items-center gap-2">
              <UserCircle2 size={16} />
              <span className="hidden md:inline">{adminEmail}</span>
            </div>
          </div>
          <button
            className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            onClick={onLogout}
          >
            {t('buttons.logout')}
          </button>
        </div>
      </div>
    </header>
  );
}
