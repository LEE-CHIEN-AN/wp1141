import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { HashtagPageClient } from '@/components/hashtag-page-client';

export default async function HashtagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag ?? '').trim().replace(/^#/, '');

  if (!decoded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-gray-900">
        <p className="text-gray-600">Invalid hashtag</p>
      </div>
    );
  }

  const normalized = decoded.toLowerCase();

  const session = await auth();

  let user: {
    id: string;
    name: string | null;
    userId: string | null;
    image: string | null;
  } | null = null;

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

  return <HashtagPageClient tag={normalized} user={user} />;
}







