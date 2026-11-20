import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    const validKey = process.env.ADMIN_PASSWORD || process.env.NEXT_PUBLIC_ADMIN_KEY;
    if (!validKey) {
      return NextResponse.json(
        { error: 'Server admin key not configured in environment.' },
        { status: 500 }
      );
    }
    if (password === validKey) {
      return NextResponse.json({ authenticated: true });
    }
    return NextResponse.json({ error: 'Invalid Admin Password' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
