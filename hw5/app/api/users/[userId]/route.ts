import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await auth();
    const currentUserId = session && (session as any).uid ? (session as any).uid : null;

    const user = await prisma.user.findUnique({
      where: { userId: params.userId },
      select: {
        id: true,
        name: true,
        userId: true,
        image: true,
        createdAt: true,
        profile: {
          select: {
            displayName: true,
            bio: true,
            avatarUrl: true,
            bannerUrl: true,
          },
        },
        _count: {
          select: {
            posts: true,
            following: true,
            followers: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // 檢查是否已 follow
    let isFollowing = false;
    if (currentUserId && currentUserId !== user.id) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: user.id,
          },
        },
      });
      isFollowing = !!follow;
    }

    return NextResponse.json({
      ...user,
      isFollowing,
      isOwnProfile: currentUserId === user.id,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}








