'use client';

import {useMemo} from 'react';
import {Coins, HandCoins, Layers3, Users, Wallet2} from 'lucide-react';
import {useLocale, useTranslations} from 'next-intl';
import Link from 'next/link';
import type {LoanType} from '@/types';
import {BrandLogo} from '@/components/layout/brand-logo';
import {usePathname, useRouter} from '@/lib/navigation';

type Props = {
  metrics: {
    totalActiveLoans: number;
    totalDisbursed: number;
    totalCollections: number;
    overdueLoans: number;
    activeMembers: number;
    activeGroups: number;
    loanTypeMetrics: Record<
      LoanType,
      {
        loanType: LoanType;
        totalCount: number;
        activeCount: number;
        disbursedAmount: number;
        outstandingBalance: number;
        dueAmount: number;
        collectedAmount: number;
      }
    >;
  };
  range: 'all' | 'month';
  month: string;
};

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'TZS',
  maximumFractionDigits: 0
});

export function DashboardOverview({metrics, range, month}: Props) {
  const t = useTranslations('dashboard');
  const nav = useTranslations('navigation');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const rangeLabel = useMemo(() => {
    if (range === 'all') {
      return 'All time';
    }
    const parsed = new Date(`${month}-01T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return month;
    }
    return new Intl.DateTimeFormat(locale, {month: 'long', year: 'numeric'}).format(parsed);
  }, [locale, month, range]);

  const updateRange = (nextRange: 'all' | 'month', nextMonth: string) => {
    const params = new URLSearchParams();
    if (nextRange === 'month') {
      params.set('range', 'month');
      params.set('month', nextMonth);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const stats = useMemo(
    () => [
      {
        label: t('total_active_loans'),
        value: metrics.totalActiveLoans.toString(),
        icon: Wallet2
      },
      {
        label: t('total_disbursed_month'),
        value: currency.format(metrics.totalDisbursed),
        icon: HandCoins
      },
      {
        label: t('total_collections'),
        value: currency.format(metrics.totalCollections),
        icon: Coins
      },
      {label: t('active_members'), value: metrics.activeMembers.toString(), icon: Users},
      {label: t('active_groups'), value: metrics.activeGroups.toString(), icon: Layers3}
    ],
    [metrics, t]
  );

  const loanTypeCards = useMemo(
    () => [
      {type: 'binafsi' as LoanType, label: nav('mikopo_binafsi'), href: '/mikopo-binafsi'},
      {
        type: 'biashara' as LoanType,
        label: nav('mikopo_wafanyabiashara'),
        href: '/mikopo-wafanyabiashara'
      },
      {type: 'watumishi' as LoanType, label: nav('mikopo_watumishi'), href: '/mikopo-watumishi'},
      {
        type: 'electronics' as LoanType,
        label: nav('mikopo_electronics'),
        href: '/mikopo-electronics'
      },
      {type: 'kilimo' as LoanType, label: nav('mikopo_kilimo'), href: '/mikopo-kilimo'},
      {type: 'bima' as LoanType, label: nav('huduma_bima'), href: '/huduma-bima'},
      {
        type: 'vikundi_wakinamama' as LoanType,
        label: nav('mikopo_vikundi_wakinamama'),
        href: '/mikopo-vikundi-wakinamama'
      },
      {
        type: 'vyombo_moto' as LoanType,
        label: nav('mikopo_vyombo_moto'),
        href: '/mikopo-vyombo-moto'
      }
    ],
    [nav]
  );

  return (
    <section className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-primary/10 via-card to-amber-100/40 p-5 dark:from-primary/15 dark:to-amber-500/10">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-primary/15 blur-2xl" />
        <div className="absolute -bottom-20 left-1/3 h-44 w-44 rounded-full bg-amber-300/20 blur-2xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Executive Overview
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Live operations snapshot for loans, collections and portfolio health.
            </p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
              Range: {rangeLabel}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border bg-card/80 px-3 py-2 shadow-sm">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Range
              </label>
              <select
                className="rounded-md border bg-background px-2 py-1 text-sm"
                value={range}
                onChange={(event) =>
                  updateRange(
                    event.target.value === 'month' ? 'month' : 'all',
                    month
                  )
                }
              >
                <option value="all">All time</option>
                <option value="month">Month</option>
              </select>
              {range === 'month' ? (
                <input
                  type="month"
                  className="rounded-md border bg-background px-2 py-1 text-sm"
                  value={month}
                  onChange={(event) => updateRange('month', event.target.value)}
                />
              ) : null}
            </div>
            <div className="hidden items-center gap-3 rounded-xl border bg-card/80 px-3 py-2 shadow-sm sm:flex">
              <BrandLogo size={46} />
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Viva Brightlife
                </p>
                <p className="text-sm font-semibold">Microfinance Co. Ltd</p>
              </div>
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

      <section className="rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {t('portfolio_breakdown')}
            </p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight">
              {t('portfolio_title')}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">{t('portfolio_hint')}</p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {loanTypeCards.map((card) => {
            const metricsForType = metrics.loanTypeMetrics?.[card.type];
            return (
              <Link
                key={card.type}
                href={`/${locale}${card.href}`}
                className="group rounded-xl border bg-background p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{card.label}</p>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                    {metricsForType?.activeCount ?? 0} {t('active_short')}
                  </span>
                </div>
                <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>{t('total_loans')}</span>
                    <span className="text-foreground">
                      {metricsForType?.totalCount ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{t('outstanding_balance')}</span>
                    <span className="text-foreground">
                      {currency.format(metricsForType?.outstandingBalance ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Due (range)</span>
                    <span className="text-foreground">
                      {currency.format(metricsForType?.dueAmount ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Collected (range)</span>
                    <span className="text-foreground">
                      {currency.format(metricsForType?.collectedAmount ?? 0)}
                    </span>
                  </div>
                </div>
                <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-2/3 rounded-full bg-primary/30 transition-all group-hover:w-5/6" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </section>
  );
}
