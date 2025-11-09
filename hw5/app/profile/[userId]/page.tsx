import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { ProfilePageClient } from '@/components/profile-page-client';

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId: targetUserId } = await params;
  const session = await auth();
  if (!session || !(session as any).uid) {
    redirect('/login');
  }

  const currentUserId = (session as any).uid as string;

  // 驗證 userId 參數
  if (!targetUserId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Invalid user ID</p>
      </div>
    );
  }

  // 取得使用者資料
  const user = await prisma.user.findUnique({
    where: { userId: targetUserId },
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
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">User not found</p>
      </div>
    );
  }

  // 檢查是否已 follow
  let isFollowing = false;
  if (currentUserId !== user.id) {
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

  const isOwnProfile = currentUserId === user.id;

  return (
    <ProfilePageClient
      user={{
        ...user,
        isFollowing,
        isOwnProfile,
      }}
    />
  );
}

