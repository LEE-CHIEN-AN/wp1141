import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/utils/api-error-handler';

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isValidHashtag(tag: string) {
  // 與前端 regex 規則一致：英數、底線、中文
  return /^[\w\u4e00-\u9fa5]+$/i.test(tag);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ tag: string }> }
) {
  const session = await auth();
  if (!session || !(session as any).uid) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { tag } = await params;
  if (!tag) {
    return NextResponse.json({ message: 'Missing hashtag' }, { status: 400 });
  }

  const decoded = decodeURIComponent(tag).trim().replace(/^#/, '');
  if (!decoded) {
    return NextResponse.json({ message: 'Invalid hashtag' }, { status: 400 });
  }

  if (!isValidHashtag(decoded)) {
    return NextResponse.json({ message: 'Invalid hashtag format' }, { status: 400 });
  }

  const normalized = decoded.toLowerCase();
  const uid = (session as any).uid as string;

  try {
    const posts = await prisma.post.findMany({
      where: {
        deletedAt: null,
        content: {
          contains: `#${normalized}`,
          mode: 'insensitive',
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            userId: true,
            image: true,
            profile: {
              select: {
                avatarUrl: true,
              },
            },
          },
        },
        media: {
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            reposts: true,
          },
        },
      },
    });

    const hashtagRegex = new RegExp(`(^|\\s)#${escapeRegExp(normalized)}(?![\\w\\u4e00-\\u9fa5])`, 'i');
    const filteredPosts = posts.filter((post) => hashtagRegex.test(post.content));

    const postsWithStatus = await Promise.all(
      filteredPosts.map(async (post) => {
        const [like, repost, bookmark] = await Promise.all([
          prisma.like.findUnique({
            where: {
              userId_postId: {
                userId: uid,
                postId: post.id,
              },
            },
          }),
          prisma.repost.findUnique({
            where: {
              userId_postId: {
                userId: uid,
                postId: post.id,
              },
            },
          }),
          prisma.bookmark.findUnique({
            where: {
              userId_postId: {
                userId: uid,
                postId: post.id,
              },
            },
          }),
        ]);

        return {
          ...post,
          isLiked: !!like,
          isReposted: !!repost,
          isBookmarked: !!bookmark,
          canDelete: post.authorId === uid,
        };
      })
    );

    return NextResponse.json({ ok: true, hashtag: normalized, posts: postsWithStatus });
  } catch (error) {
    return handleApiError(error);
  }
}

