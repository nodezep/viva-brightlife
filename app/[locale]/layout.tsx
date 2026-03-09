import {notFound} from 'next/navigation';
import {getMessages, getTimeZone} from 'next-intl/server';
import {AppProviders} from '@/components/providers';

const locales = ['en', 'sw'];

export const dynamic = 'force-dynamic';

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: {locale: string};
}) {
  const {locale} = params;

  if (!locales.includes(locale)) {
    notFound();
  }

  const messages = await getMessages();
  const timeZone = await getTimeZone();

  return (
    <AppProviders locale={locale} messages={messages} timeZone={timeZone}>
      {children}
    </AppProviders>
  );
}
