'use client';

import {ThemeProvider} from 'next-themes';
import {NextIntlClientProvider, type AbstractIntlMessages} from 'next-intl';
import {SessionTimeout} from '@/components/auth/SessionTimeout';

type Props = {
  children: React.ReactNode;
  locale: string;
  messages: AbstractIntlMessages;
  timeZone: string;
};

export function AppProviders({children, locale, messages, timeZone}: Props) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        {children}
        <SessionTimeout />
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
