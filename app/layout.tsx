import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Viva Brightlife Microfinance',
  description: 'Microfinance admin management system'
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}