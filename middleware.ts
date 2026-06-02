import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Permitir acceso libre a páginas públicas, assets y panel de refugios
  if (
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/login') ||
    pathname.startsWith('/mascota') ||
    pathname.startsWith('/catalogo') ||
    pathname.startsWith('/mapa') ||
    pathname.startsWith('/perdidos') ||
    pathname.startsWith('/reportar') ||
    pathname.startsWith('/quienes-somos') ||
    pathname.startsWith('/faq') ||
    pathname.startsWith('/contacto') ||
    pathname.startsWith('/donar') ||
    pathname.startsWith('/noticias') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/refugios') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
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
