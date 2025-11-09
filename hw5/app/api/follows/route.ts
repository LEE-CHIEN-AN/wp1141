import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const followSchema = z.object({
  userId: z.string(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session || !(session as any).uid) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = followSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid userId' }, { status: 400 });
    }

    const followerId = (session as any).uid as string;
    const followingId = parsed.data.userId;

    if (followerId === followingId) {
      return NextResponse.json({ message: 'Cannot follow yourself' }, { status: 400 });
    }

    // 檢查使用者是否存在
    const user = await prisma.user.findUnique({
      where: { id: followingId },
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // 建立 follow 關係
    const follow = await prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
    });

    return NextResponse.json({ ok: true, follow });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ message: 'Already following' }, { status: 409 });
    }
    console.error('Error following user:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session || !(session as any).uid) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ message: 'userId is required' }, { status: 400 });
    }

    const followerId = (session as any).uid as string;

    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId: userId,
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ message: 'Not following' }, { status: 404 });
    }
    console.error('Error unfollowing user:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}








