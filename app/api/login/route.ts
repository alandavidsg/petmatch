import { NextRequest, NextResponse } from 'next/server';

const PASSWORD = process.env.SITE_PASSWORD ?? 'petmatch2025';

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (password !== PASSWORD) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('petmatch_auth', 'ok', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 horas
    path: '/',
  });
  return res;
}
