'use client';

import { LoanStatementDialogContent } from './loan-statement-dialog-content';
import { X } from 'lucide-react';
import type { LoanRecord } from '@/types';

type Props = {
  loan: LoanRecord;
  onClose: () => void;
};

export function LoanStatementDialog({ loan, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md print:bg-transparent print:p-0">
      <div className="flex max-h-[95vh] w-full max-w-5xl flex-col rounded-3xl bg-background border shadow-2xl overflow-hidden print:rounded-none print:border-0 print:shadow-none">
        <div className="flex justify-end p-4 border-b no-print">
          <button onClick={onClose} className="rounded-full p-2 hover:bg-muted">
            <X size={24} />
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          <LoanStatementDialogContent loan={loan} />
        </div>
      </div>
    </div>
  );
}
