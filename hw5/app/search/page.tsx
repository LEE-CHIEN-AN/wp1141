import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { SearchPageClient } from '@/components/search-page-client';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || '';

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

  return <SearchPageClient user={user} initialQuery={query} />;
}




