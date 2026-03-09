'use client';

import {useState} from 'react';
import {Plus} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {LoanForm} from './loan-form';
import type {LoanType} from '@/types';
import type {MemberOption} from '@/lib/data';

type Props = {
  loanType: LoanType;
  members: MemberOption[];
};

export function LoanFormDialog({loanType, members}: Props) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  return (
    <div className="no-print">
      <div className="flex justify-end mb-2">
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          onClick={() => setOpen((v) => !v)}
        >
          <Plus size={16} /> {open ? t('buttons.cancel') : t('buttons.add_new')}
        </button>
      </div>
      
      {open ? (
        <div className="mb-4">
           <LoanForm loanType={loanType} members={members} onClose={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}
