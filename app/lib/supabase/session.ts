import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getOptionalPublicEnv } from '@/lib/env';

const PROTECTED_PREFIXES = [
  '/overview',
  '/dashboard',
  '/portfolio',
  '/watchlist',
  '/sandbox',
  '/career',
  '/settings',
  '/admin',
  '/auth/onboarding',
  '/auth/update-password',
];
const AUTH_ONLY_PREFIXES = ['/auth/login', '/auth/signup', '/auth/forgot'];

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
  return to;
}

function isPath(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { supabaseUrl, supabasePublishableKey } = getOptionalPublicEnv();
  if (!supabaseUrl || !supabasePublishableKey) return supabaseResponse;

  try {
    const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;

    if (!user && isPath(pathname, PROTECTED_PREFIXES)) {
      const login = new URL('/auth/login', request.url);
      login.searchParams.set('next', pathname);
      return copyCookies(supabaseResponse, NextResponse.redirect(login));
    }

    if (user && isPath(pathname, AUTH_ONLY_PREFIXES)) {
      return copyCookies(
        supabaseResponse,
        NextResponse.redirect(new URL('/overview', request.url))
      );
    }
  } catch {
    // Auth refresh failed — continue without session
  }

  return supabaseResponse;
}
