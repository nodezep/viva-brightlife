'use client';

import {useRouter, useSearchParams, usePathname} from 'next/navigation';
import {useTranslations} from 'next-intl';

type Props = {
  totalCount: number;
  currentPage: number;
};

const PAGE_SIZE = 50;

export function PaginationControls({totalCount, currentPage}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const t = useTranslations();

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  const navigateToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`${pathname}?${params.toString()}` as any);
  };

  return (
    <div className="flex items-center justify-between py-4 no-print text-sm selection">
      <div className="text-muted-foreground">
        Page {currentPage} of {totalPages}
      </div>
      <div className="flex items-center gap-2">
        <button
          className="rounded-lg border px-3 py-1.5 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={currentPage <= 1}
          onClick={() => navigateToPage(currentPage - 1)}
        >
          {t('buttons.previous') || 'Previous'}
        </button>
        <button
          className="rounded-lg border px-3 py-1.5 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={currentPage >= totalPages}
          onClick={() => navigateToPage(currentPage + 1)}
        >
          {t('buttons.next') || 'Next'}
        </button>
      </div>
    </div>
  );
}
