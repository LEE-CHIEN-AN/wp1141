import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { ProfilePageClient } from '@/components/profile-page-client';

export default async function ProfilePage() {
  const session = await auth();
  if (!session || !(session as any).uid) {
    redirect('/login');
  }

  const userId = (session as any).uid as string;

  // 取得自己的資料
  const user = await prisma.user.findUnique({
    where: { id: userId },
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

  if (!user || !user.userId) {
    redirect('/register');
  }

  return (
    <ProfilePageClient
      user={{
        ...user,
        isFollowing: false,
        isOwnProfile: true,
      }}
    />
  );
}

