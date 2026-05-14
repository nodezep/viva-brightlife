'use client';

import { useState } from 'react';
import { X, FileText, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LoanRecord, LoanType } from '@/types';
import { LoanSchedulesDialogContent } from '@/components/loans/loan-schedules-dialog-content';
import { LoanStatementDialogContent } from '@/components/loans/loan-statement-dialog-content';

type Props = {
  loan: LoanRecord;
  loanType: LoanType;
  initialTab?: 'schedule' | 'statement';
  onClose: () => void;
};

export function LoanDetailsDialog({ loan, loanType, initialTab = 'schedule', onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'schedule' | 'statement'>(initialTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md no-print">
      <div className="flex max-h-[95vh] w-full max-w-5xl flex-col rounded-3xl bg-background border shadow-2xl overflow-hidden">
        
        {/* Header & Tabs */}
        <div className="flex items-center justify-between bg-muted/30 px-8 py-4 border-b">
          <div className="flex items-center gap-6">
            <div>
              <h2 className="text-xl font-black tracking-tight text-foreground">{loan.memberName}</h2>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{loan.loanNumber}</p>
            </div>
            
            <div className="h-8 w-px bg-border mx-2" />
            
            <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
              <button
                onClick={() => setActiveTab('schedule')}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-black transition-all",
                  activeTab === 'schedule' 
                    ? "bg-background text-primary shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <CalendarDays size={18} /> MAREJESHO
              </button>
              <button
                onClick={() => setActiveTab('statement')}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-black transition-all",
                  activeTab === 'statement' 
                    ? "bg-background text-primary shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <FileText size={18} /> STATEMENT
              </button>
            </div>
          </div>
          
          <button 
            onClick={onClose} 
            className="rounded-full bg-muted/50 p-2 text-muted-foreground hover:bg-rose-500 hover:text-white transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-card/30">
          {activeTab === 'schedule' ? (
            <LoanSchedulesDialogContent 
              loanId={loan.id} 
              loanType={loanType} 
              repaymentFrequency={loan.repaymentFrequency} 
            />
          ) : (
            <LoanStatementDialogContent loan={loan} />
          )}
        </div>
      </div>
    </div>
  );
}
