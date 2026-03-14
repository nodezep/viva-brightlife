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

  // Attempt to get user, but handle errors gracefully
  // This prevents "Refresh Token Not Found" errors from breaking the app
  const authResult = await supabase.auth.getUser();
  const user = authResult.data?.user;
  const authError = authResult.error;

  // If there's an auth error (e.g., invalid/expired refresh token),
  // clear the auth cookies to allow fresh login
  if (authError || !user) {
    // Clear all auth-related cookies by setting them to expire immediately
    const cookieNames = ['sb-access-token', 'sb-refresh-token', 'supabase-auth-token'];
    cookieNames.forEach(name => {
      response.cookies.set(name, '', {
        path: '/',
        expires: new Date(0),
        httpOnly: true,
        sameSite: 'lax'
      });
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
