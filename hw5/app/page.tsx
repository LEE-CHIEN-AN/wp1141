import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { HomePageClient } from '@/components/home-page-client';

export default async function Home() {
  const session = await auth();
  
  // 如果沒有 session，直接返回 null
  if (!session || !(session as any).uid) {
    return <HomePageClient user={null} />;
  }

  const uid = (session as any).uid as string;
  
  let user = null;
  try {
    user = await prisma.user.findUnique({
      where: { id: uid },
      select: {
        id: true,
        name: true,
        userId: true,
        image: true,
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    // 如果是資料庫連線錯誤，記錄詳細資訊
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string; message?: string };
      console.error('Prisma error code:', prismaError.code);
      console.error('Prisma error message:', prismaError.message);
    }
    // 即使發生錯誤，也返回 null，讓前端顯示錯誤訊息
  }

  return <HomePageClient user={user} />;
}
