import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json({ error: 'MercadoPago no configurado' }, { status: 500 });
  }

  const { amount } = await req.json();
  if (!amount || typeof amount !== 'number' || amount < 100) {
    return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://petmatch-gamma.vercel.app';

  try {
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            id: 'donacion-petmatch',
            title: 'Donación PetMatch',
            description: 'Ayuda a rescatar, alimentar y encontrar hogar para mascotas callejeras.',
            quantity: 1,
            unit_price: amount,
            currency_id: 'CLP',
          },
        ],
        back_urls: {
          success: `${baseUrl}/donar/gracias`,
          failure: `${baseUrl}/donar`,
          pending: `${baseUrl}/donar/gracias`,
        },
        auto_return: 'approved',
        statement_descriptor: 'PetMatch',
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('MercadoPago error:', response.status, err);
      return NextResponse.json({ error: 'Error al crear preferencia' }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json({ init_point: data.init_point });
  } catch (err) {
    console.error('crear-preferencia error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
