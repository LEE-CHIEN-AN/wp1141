import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PostPageClient } from '@/components/post-page-client';

export default async function PostPage() {
  const session = await auth();
  
  if (!session || !(session as any).uid) {
    return (
      <div className="min-h-screen bg-black">
        <div className="mx-auto max-w-2xl p-4">
          <p className="text-[#71767A]">Please log in to continue</p>
        </div>
      </div>
    );
  }

  let user = null;
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

  if (!user) {
    return (
      <div className="min-h-screen bg-black">
        <div className="mx-auto max-w-2xl p-4">
          <p className="text-[#71767A]">User not found</p>
        </div>
      </div>
    );
  }

  return <PostPageClient user={user} />;
}
