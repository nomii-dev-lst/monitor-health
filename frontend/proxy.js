import { NextResponse } from 'next/server';

/**
 * Next.js Middleware for authentication
 * Runs at the edge before pages render - prevents unauthorized access
 * and eliminates client-side auth flicker
 */
export function proxy(req) {
  const { pathname, search } = req.nextUrl;
  const refreshToken = req.cookies.get('refreshToken')?.value;
  const isAuthenticated = Boolean(refreshToken);

  // Define protected routes (require authentication)
  const isProtectedRoute = 
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/monitors') ||
    pathname.startsWith('/logs') ||
    pathname.startsWith('/settings');

  // Define auth pages (should not be accessible when authenticated)
  const isAuthPage = pathname === '/' || pathname.startsWith('/signup');

  // Redirect unauthenticated users from protected routes to login
  if (isProtectedRoute && !isAuthenticated) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    // Preserve the original destination for redirect after login
    url.searchParams.set('callbackUrl', pathname + search);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users from auth pages to dashboard
  if (isAuthPage && isAuthenticated) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Allow request to proceed
  return NextResponse.next();
}

/**
 * Configure which routes the middleware should run on
 * Only runs on routes that need auth logic - improves performance
 */
export const config = {
  matcher: [
    '/',
    '/signup',
    '/dashboard/:path*',
    '/monitors/:path*',
    '/logs/:path*',
    '/settings/:path*',
  ],
};
