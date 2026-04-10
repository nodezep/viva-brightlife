'use client';

import {useState} from 'react';
import {Plus} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {LoanForm} from './loan-form';
import type {LoanType} from '@/types';

type Props = {
  loanType: LoanType;
};

export function LoanFormDialog({loanType}: Props) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  return (
    <div className="no-print w-full">
      <div className="flex justify-end mb-2">
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          onClick={() => setOpen((v) => !v)}
        >
          <Plus size={16} /> {open ? t('buttons.cancel') : t('buttons.add_new')}
        </button>
      </div>

      {successMessage ? (
        <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {successMessage}
        </div>
      ) : null}
      
      {open ? (
        <div className="mb-4 w-full">
          <div className="mx-auto w-full max-w-5xl">
            <LoanForm
              loanType={loanType}
              onClose={() => setOpen(false)}
              onSuccess={(message) => {
                setSuccessMessage(message);
                setTimeout(() => setSuccessMessage(''), 4000);
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
