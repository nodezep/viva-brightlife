'use client';

import { LoanSchedulesDialogContent } from './loan-schedules-dialog-content';
import { X } from 'lucide-react';

type Props = {
  loanId: string;
  loanType?: string;
  repaymentFrequency?: 'weekly' | 'daily' | 'monthly';
  onClose: () => void;
};

export function LoanSchedulesDialog({loanId, loanType, repaymentFrequency, onClose}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-background shadow-xl overflow-hidden">
        <div className="flex justify-end p-4 border-b">
          <button onClick={onClose} className="rounded-full p-2 hover:bg-muted">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          <LoanSchedulesDialogContent 
            loanId={loanId} 
            loanType={loanType} 
            repaymentFrequency={repaymentFrequency} 
          />
        </div>
      </div>
    </div>
  );
}
