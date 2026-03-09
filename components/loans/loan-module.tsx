import {getTranslations} from 'next-intl/server';
import type {LoanType} from '@/types';
import {getLoansByType, getMembersForGroupSelection} from '@/lib/data';
import {LoanFilters} from './loan-filters';
import {LoanTable} from './loan-table';
import {LoanFormDialog} from './loan-form-dialog';
import {PaginationControls} from './pagination-controls';
import {PrintButton} from './print-button';

type Props = {
  loanType: LoanType;
  title: string;
  query: string;
  startDate: string;
  endDate: string;
  page: number;
};

export async function LoanModule({loanType, title, query, startDate, endDate, page}: Props) {
  const t = await getTranslations();
  const [members, {data: rows, count}] = await Promise.all([
    getMembersForGroupSelection(),
    getLoansByType(loanType, query, startDate, endDate, page)
  ]);

  return (
    <section className="space-y-4 relative w-full">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">Live Supabase records</p>
        </div>
        
        <div className="no-print flex gap-2">
          <PrintButton />
          <LoanFormDialog loanType={loanType} members={members} />
        </div>
      </div>
      
      <LoanFilters />
      
      <LoanTable loanType={loanType} rows={rows} count={count} />
      
      {count > 0 ? (
        <PaginationControls totalCount={count} currentPage={page} />
      ) : null}
    </section>
  );
}
