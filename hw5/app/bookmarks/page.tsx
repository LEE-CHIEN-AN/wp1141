import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { BookmarksPageClient } from '@/components/bookmarks-page-client';
import { redirect } from 'next/navigation';

export default async function Bookmarks() {
  const session = await auth();
  
  if (!session || !(session as any).uid) {
    redirect('/login');
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
  }

  return <BookmarksPageClient user={user} />;
}




