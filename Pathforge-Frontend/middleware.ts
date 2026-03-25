import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('next-auth.session-token')?.value;

  if (!token) {
    // If no token and trying to access protected route, redirect to home
    const isProtected = [
      '/dashboard',
      '/assessment',
      '/skill-gap',
      '/universities',
      '/market-intel',
      '/roadmap',
      '/progress',
      '/profile',
      '/resources',
    ].some(path => request.nextUrl.pathname.startsWith(path));

    if (isProtected) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  } else {
    // Verify the token
    try {
      const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
      await jwtVerify(token, secret);
    } catch {
      // Invalid token, redirect
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Allow
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/assessment/:path*",
    "/skill-gap/:path*",
    "/universities/:path*",
    "/market-intel/:path*",
    "/roadmap/:path*",
    "/progress/:path*",
    "/profile/:path*",
    "/resources/:path*",
  ],
};
