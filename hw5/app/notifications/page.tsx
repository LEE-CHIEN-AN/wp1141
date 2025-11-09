import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NotificationsPageClient } from '@/components/notifications-page-client';

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const type = params.type || 'all';

  const session = await auth();
  
  let user = null;
  if (session && (session as any).uid) {
    try {
      user = await prisma.user.findUnique({
        where: { id: (session as any).uid as string },
        select: {
          id: true,
          name: true,
          userId: true,
          image: true,
        },
      });
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  }

  return <NotificationsPageClient user={user} initialType={type} />;
}




