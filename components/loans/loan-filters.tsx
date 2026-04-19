'use client';

import {useRouter, useSearchParams, usePathname} from 'next/navigation';
import {Search} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {useCallback, useTransition, useState, type ReactNode} from 'react';

const Field = ({label, children}: {label: string; children: ReactNode}) => (
  <div className="relative">
    {children}
    <label className="pointer-events-none absolute left-3 top-1 text-[10px] font-bold uppercase tracking-wider text-primary/50 transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:text-muted-foreground peer-focus:top-1 peer-focus:text-[10px] peer-focus:font-bold peer-focus:text-primary">
      {label}
    </label>
  </div>
);

type Props = {
  defaultSort?: string;
};

export function LoanFilters({defaultSort = 'newest'}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState(searchParams.get('query') || '');
  const [startDate, setStartDate] = useState(searchParams.get('startDate') || '');
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || defaultSort);

  const applyFilters = useCallback(
    (newQuery: string, newStart: string, newEnd: string, newSort: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newQuery) params.set('query', newQuery);
      else params.delete('query');
      
      if (newStart) params.set('startDate', newStart);
      else params.delete('startDate');
      
      if (newEnd) params.set('endDate', newEnd);
      else params.delete('endDate');

      if (newSort && newSort !== 'newest') params.set('sort', newSort);
      else params.delete('sort');
      
      params.set('page', '1');

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}` as any);
      });
    },
    [router, pathname, searchParams]
  );

  return (
    <div
      className={`no-print grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 md:grid-cols-5 ${
        isPending ? 'opacity-50' : ''
      }`}
    >
      <div className="relative sm:col-span-2 md:col-span-2">
        <input
          className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 pl-9 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
          placeholder=" "
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            applyFilters(e.target.value, startDate, endDate, sort);
          }}
        />
        <Search className="pointer-events-none absolute left-3 top-3 text-muted-foreground transition-all peer-focus:text-primary" size={16} />
        <label className="pointer-events-none absolute left-9 top-1 text-[10px] font-bold uppercase tracking-wider text-primary/50 transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:text-muted-foreground peer-focus:top-1 peer-focus:text-[10px] peer-focus:font-bold peer-focus:text-primary">
          {t('loan.search_placeholder')}
        </label>
      </div>

      <Field label="Start Date">
        <input
          type="date"
          className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
          placeholder=" "
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            applyFilters(query, e.target.value, endDate, sort);
          }}
        />
      </Field>

      <Field label="End Date">
        <input
          type="date"
          className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
          placeholder=" "
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value);
            applyFilters(query, startDate, e.target.value, sort);
          }}
        />
      </Field>

      <div className="relative sm:col-span-2 md:col-span-1">
        <select
          className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            applyFilters(query, startDate, endDate, e.target.value);
          }}
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="sno_asc">S/NO (Asc)</option>
          <option value="sno_desc">S/NO (Desc)</option>
          <option value="name_asc">Name (A-Z)</option>
          <option value="name_desc">Name (Z-A)</option>
        </select>
        <label className="pointer-events-none absolute left-3 top-1 text-[10px] font-bold uppercase tracking-wider text-primary/50 transition-all peer-focus:top-1 peer-focus:text-[10px] peer-focus:font-bold peer-focus:text-primary">
          Sort By
        </label>
      </div>
    </div>
  );
}
