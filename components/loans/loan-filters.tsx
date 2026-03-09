'use client';

import {useRouter, useSearchParams, usePathname} from 'next/navigation';
import {Search} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {useCallback, useTransition, useState} from 'react';

export function LoanFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState(searchParams.get('query') || '');
  const [startDate, setStartDate] = useState(searchParams.get('startDate') || '');
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');

  const applyFilters = useCallback(
    (newQuery: string, newStart: string, newEnd: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newQuery) params.set('query', newQuery);
      else params.delete('query');
      
      if (newStart) params.set('startDate', newStart);
      else params.delete('startDate');
      
      if (newEnd) params.set('endDate', newEnd);
      else params.delete('endDate');
      
      params.set('page', '1');

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}` as any);
      });
    },
    [router, pathname, searchParams]
  );

  return (
    <div className={`no-print grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-4 ${isPending ? 'opacity-50' : ''}`}>
      <label className="relative md:col-span-2">
        <Search className="pointer-events-none absolute left-3 top-2.5" size={16} />
        <input
          className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm"
          placeholder={t('loan.search_placeholder')}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            applyFilters(e.target.value, startDate, endDate);
          }}
        />
      </label>
      <input
        type="date"
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        value={startDate}
        onChange={(e) => {
          setStartDate(e.target.value);
          applyFilters(query, e.target.value, endDate);
        }}
      />
      <input
        type="date"
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        value={endDate}
        onChange={(e) => {
          setEndDate(e.target.value);
          applyFilters(query, startDate, e.target.value);
        }}
      />
    </div>
  );
}
