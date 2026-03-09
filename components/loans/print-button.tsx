'use client';

import {Printer} from 'lucide-react';
import {useTranslations} from 'next-intl';

export function PrintButton() {
  const t = useTranslations();
  
  return (
    <button
      className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm no-print"
      onClick={() => window.print()}
    >
      <Printer size={16} /> {t('buttons.print')}
    </button>
  );
}
