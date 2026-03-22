'use client';

import {useEffect, useState} from 'react';
import {Header} from './header';
import {Sidebar} from './sidebar';
import {MobileNav} from './mobile-nav';
import {NotificationsPopout} from '@/components/notifications/notifications-popout';

type Props = {
  children: React.ReactNode;
  adminEmail: string;
};

export function AdminShell({children, adminEmail}: Props) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem('sidebar-collapsed');
    if (saved === 'true') {
      setCollapsed(true);
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        onToggleSidebar={() => setOpen((s) => !s)}
        onToggleCollapse={toggleCollapsed}
        collapsed={collapsed}
        adminEmail={adminEmail}
      />
      <NotificationsPopout />
      <Sidebar open={open} collapsed={collapsed} onClose={() => setOpen(false)} />
      <main
        className={`print-area px-3 pb-24 pt-20 sm:px-4 lg:px-6 lg:pb-8 ${
          collapsed ? 'lg:ml-16' : 'lg:ml-72'
        }`}
      >
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
