import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const patchSchema = z.object({
  role: z.enum(['admin', 'selector', 'viewer']).optional(),
  password: z.string().min(6).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session || (session?.user as { role?: string })?.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data: Record<string, string> = {};
  if (parsed.data.role) data.role = parsed.data.role;
  if (parsed.data.password) data.password = await bcrypt.hash(parsed.data.password, 12);

  const user = await db.user.update({
    where: { id: params.id },
    data,
    select: { id: true, username: true, role: true, createdAt: true },
  });

  return NextResponse.json(user);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session || (session?.user as { role?: string })?.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Prevent deleting yourself
  const me = await db.user.findFirst({
    where: { username: session.user?.name ?? '' },
  });
  if (me?.id === params.id)
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });

  await db.user.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
