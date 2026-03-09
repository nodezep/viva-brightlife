import {notFound} from 'next/navigation';
import {getRequestConfig} from 'next-intl/server';

const locales = ['en', 'sw'] as const;

export default getRequestConfig(async ({requestLocale}) => {
  const locale = await requestLocale;

  if (!locale || !locales.includes(locale as (typeof locales)[number])) {
    notFound();
  }

  return {
    locale,
    timeZone: 'Africa/Dar_es_Salaam',
    messages: (await import(`./messages/${locale}.json`)).default
  };
});
