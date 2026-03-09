import {CookieOptions, createServerClient} from '@supabase/ssr';
import createIntlMiddleware from 'next-intl/middleware';
import {NextRequest} from 'next/server';

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

const handleI18nRouting = createIntlMiddleware({
  locales: ['en', 'sw'],
  defaultLocale: 'sw'
});

export async function middleware(request: NextRequest) {
  const response = handleI18nRouting(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({name, value, options}) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        }
      }
    }
  );

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};