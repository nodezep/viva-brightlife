'use client';

import {useEffect} from 'react';
import {Languages} from 'lucide-react';
import {useLocale} from 'next-intl';
import {usePathname, useRouter} from '@/lib/navigation';

export function LanguageToggle() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('locale');
    if (stored && stored !== locale && (stored === 'en' || stored === 'sw')) {
      router.replace(pathname, {locale: stored});
    }
  }, [locale, pathname, router]);

  const toggle = () => {
    const nextLocale = locale === 'sw' ? 'en' : 'sw';
    localStorage.setItem('locale', nextLocale);
    router.replace(pathname, {locale: nextLocale});
  };

  return (
    <button
      type="button"
      className="rounded-lg border px-3 py-2 text-sm hover:bg-muted"
      onClick={toggle}
      aria-label="toggle language"
    >
      <span className="inline-flex items-center gap-2">
        <Languages size={16} /> {locale.toUpperCase()}
      </span>
    </button>
  );
}