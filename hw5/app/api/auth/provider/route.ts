import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { userIdSchema } from '@/lib/validators/user';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = userIdSchema.safeParse(body?.userId);

  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid userID' }, { status: 400 });
  }

  const normalizedUserId = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { userId: normalizedUserId },
      select: {
        id: true,
        name: true,
        userId: true,
        accounts: {
          select: {
            provider: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    if (!user.accounts || user.accounts.length === 0) {
      return NextResponse.json({ message: 'No provider linked to this user' }, { status: 409 });
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        userId: user.userId,
      },
      providers: user.accounts.map((account) => account.provider),
    });
  } catch (error) {
    console.error('Error fetching provider by userId:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}







