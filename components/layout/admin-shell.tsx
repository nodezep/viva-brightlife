'use client';

import {useState} from 'react';
import {Header} from './header';
import {Sidebar} from './sidebar';

type Props = {
  children: React.ReactNode;
  adminEmail: string;
};

export function AdminShell({children, adminEmail}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header
        onToggleSidebar={() => setOpen((s) => !s)}
        adminEmail={adminEmail}
      />
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <main className="print-area px-4 pb-8 pt-20 lg:ml-72 lg:px-6">{children}</main>
    </div>
  );
}
