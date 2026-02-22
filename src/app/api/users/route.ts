import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

export async function GET() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session || role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const users = await db.user.findMany({
    select: { id: true, username: true, role: true, provider: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(users);
}

const createSchema = z.object({
  username: z.string().min(2).max(32).regex(/^[a-zA-Z0-9_-]+$/, 'Only letters, numbers, _ and - allowed'),
  password: z.string().min(6),
  role: z.enum(['admin', 'selector', 'viewer']),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session?.user as { role?: string })?.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { username, password, role } = parsed.data;

  const exists = await db.user.findUnique({ where: { username } });
  if (exists)
    return NextResponse.json({ error: 'Username already taken' }, { status: 409 });

  const hashed = await bcrypt.hash(password, 12);
  const user = await db.user.create({
    data: { username, password: hashed, role },
    select: { id: true, username: true, role: true, createdAt: true },
  });

  return NextResponse.json(user, { status: 201 });
}
