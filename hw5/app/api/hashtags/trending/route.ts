import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { extractHashtags } from '@/lib/utils/post-counter';
import { handleApiError } from '@/lib/utils/api-error-handler';

const MAX_POSTS = 500;
const MAX_HASHTAGS = 10;

export async function GET() {
  const session = await auth();
  if (!session || !(session as any).uid) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const posts = await prisma.post.findMany({
      where: {
        deletedAt: null,
        content: {
          contains: '#',
        },
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_POSTS,
      select: {
        content: true,
      },
    });

    const counts = new Map<string, number>();

    posts.forEach((post) => {
      const hashtags = extractHashtags(post.content);
      hashtags.forEach((tag) => {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      });
    });

    const trending = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, MAX_HASHTAGS)
      .map(([tag, count]) => ({ tag, count }));

    return NextResponse.json({ ok: true, trending });
  } catch (error) {
    return handleApiError(error);
  }
}

