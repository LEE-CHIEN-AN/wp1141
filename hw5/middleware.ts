import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const session = await auth();

  // 允許公開訪問的路由
  const publicPaths = ['/api/auth', '/api/register', '/api/pusher/auth', '/api/pusher/mock', '/api/pusher/mock/trigger', '/mock', '/register', '/login'];
  const isPublicPath = publicPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isPublicPath) {
    return NextResponse.next();
  }

  // 如果未登入，導向登入頁面
  if (!session || !(session as any).uid) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 如果已登入但沒有 userId，導向註冊頁面（除了註冊頁面本身）
  if (!(session as any).userId && request.nextUrl.pathname !== '/register') {
    return NextResponse.redirect(new URL('/register', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

