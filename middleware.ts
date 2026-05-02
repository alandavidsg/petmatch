import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Permitir acceso libre a la página de login y assets
  if (pathname.startsWith('/login') || pathname.startsWith('/api/login') || pathname.startsWith('/donar/gracias') || pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  // Verificar cookie de autenticación
  const auth = req.cookies.get('petmatch_auth');
  if (auth?.value === 'ok') {
    return NextResponse.next();
  }

  // Redirigir al login
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = '/login';
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
