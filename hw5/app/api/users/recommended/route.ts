import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session || !(session as any).uid) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const uid = (session as any).uid as string;

  try {
    // 取得當前用戶已關注的用戶 ID
    const following = await prisma.follow.findMany({
      where: { followerId: uid },
      select: { followingId: true },
    });

    const followingIds = following.map((f) => f.followingId);
    // 將當前用戶 ID 也加入排除列表
    const excludeIds = [...followingIds, uid];

    // 取得推薦用戶（排除自己和已關注的用戶，限制 5 個）
    const users = await prisma.user.findMany({
      where: {
        id: { notIn: excludeIds },
        userId: { not: null },
      },
      take: 5,
      select: {
        id: true,
        name: true,
        userId: true,
        image: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ ok: true, users });
  } catch (error) {
    console.error('Error fetching recommended users:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}








