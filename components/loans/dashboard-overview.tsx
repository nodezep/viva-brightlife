'use client';

import {useMemo} from 'react';
import {
  AlertTriangle,
  Coins,
  HandCoins,
  Layers3,
  Users,
  Wallet2
} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {BrandLogo} from '@/components/layout/brand-logo';

type Props = {
  metrics: {
    totalActiveLoans: number;
    totalDisbursedThisMonth: number;
    totalCollections: number;
    overdueLoans: number;
    activeMembers: number;
    activeGroups: number;
  };
};

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'TZS',
  maximumFractionDigits: 0
});

export function DashboardOverview({metrics}: Props) {
  const t = useTranslations('dashboard');

  const stats = useMemo(
    () => [
      {
        label: t('total_active_loans'),
        value: metrics.totalActiveLoans.toString(),
        icon: Wallet2
      },
      {
        label: t('total_disbursed_month'),
        value: currency.format(metrics.totalDisbursedThisMonth),
        icon: HandCoins
      },
      {
        label: t('total_collections'),
        value: currency.format(metrics.totalCollections),
        icon: Coins
      },
      {
        label: t('overdue_loans'),
        value: metrics.overdueLoans.toString(),
        icon: AlertTriangle
      },
      {label: t('active_members'), value: metrics.activeMembers.toString(), icon: Users},
      {label: t('active_groups'), value: metrics.activeGroups.toString(), icon: Layers3}
    ],
    [metrics, t]
  );

  return (
    <section className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-primary/10 via-card to-amber-100/40 p-5 dark:from-primary/15 dark:to-amber-500/10">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-primary/15 blur-2xl" />
        <div className="absolute -bottom-20 left-1/3 h-44 w-44 rounded-full bg-amber-300/20 blur-2xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Executive Overview
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Live operations snapshot for loans, collections and portfolio health.
            </p>
          </div>
          <div className="hidden items-center gap-3 rounded-xl border bg-card/80 px-3 py-2 shadow-sm sm:flex">
            <BrandLogo size={46} />
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Viva Brightlife</p>
              <p className="text-sm font-semibold">Microfinance Co. Ltd</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="group rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <stat.icon size={16} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{stat.value}</p>
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full w-2/3 rounded-full bg-primary/40 transition-all group-hover:w-5/6" />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
