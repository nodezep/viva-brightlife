import {getTranslations} from 'next-intl/server';
import type {LoanType} from '@/types';
import {getLoansByType} from '@/lib/data';
import {LoanFilters} from './loan-filters';
import {LoanTable} from './loan-table';
import {LoanFormDialog} from './loan-form-dialog';
import {PaginationControls} from './pagination-controls';
import {PrintButton} from './print-button';
import {LoanExportButton} from './loan-export-button';

type Props = {
  loanType: LoanType;
  title: string;
  query: string;
  startDate: string;
  endDate: string;
  page: number;
  sort?: string;
};

export async function LoanModule({loanType, title, query, startDate, endDate, page, sort}: Props) {
  const t = await getTranslations();
  const defaultSort = loanType === 'binafsi' ? 'sno_asc' : 'newest';
  const activeSort = sort || defaultSort;
  const {data: rows, count} = await getLoansByType(
    loanType,
    query,
    startDate,
    endDate,
    page,
    activeSort as any
  );

  return (
    <section className="space-y-4 relative w-full">
      <div className="flex flex-wrap items-start gap-3">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">Live Supabase records</p>
        </div>
        
        <div className="min-w-[280px] flex-1 max-w-4xl">
          <LoanFilters defaultSort={defaultSort} />
        </div>

        <div className="no-print flex gap-2">
          <PrintButton />
          <LoanExportButton loanType={loanType} />
        </div>
      </div>

      <LoanFormDialog loanType={loanType} />
      
      <LoanTable loanType={loanType} rows={rows} count={count} />
      
      {count > 0 ? (
        <PaginationControls totalCount={count} currentPage={page} />
      ) : null}
    </section>
  );
}
