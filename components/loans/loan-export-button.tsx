'use client';

import {Download} from 'lucide-react';
import {useTranslations} from 'next-intl';
import type {LoanType} from '@/types';

type Props = {
  loanType: LoanType;
};

export function LoanExportButton({loanType}: Props) {
  const t = useTranslations();

  return (
    <button
      className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm no-print"
      onClick={() => {
        window.dispatchEvent(
          new CustomEvent('loan-export', {detail: {loanType}})
        );
      }}
    >
      <Download size={16} /> {t('buttons.export')}
    </button>
  );
}
