import { NextRequest, NextResponse } from 'next/server';
import { getMobileUserFromRequest } from '@/lib/mobile-auth';

export async function GET(req: NextRequest) {
  const user = await getMobileUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    id: user.id,
    username: user.username,
    role: user.role,
  });
}
