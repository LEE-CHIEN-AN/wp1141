import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/utils/api-error-handler';

// GET: 獲取用戶的書籤列表
export async function GET(req: Request) {
  const session = await auth();
  if (!session || !(session as any).uid) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const uid = (session as any).uid as string;
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '20');
  const cursor = searchParams.get('cursor');

  try {
    const where: any = {
      userId: uid,
    };

    const bookmarks = await prisma.bookmark.findMany({
      where,
      take: limit + 1,
      ...(cursor && {
        cursor: {
          userId_postId: {
            userId: uid,
            postId: cursor,
          },
        },
        skip: 1,
      }),
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
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
              take: 4,
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
        },
      },
    });

    const hasMore = bookmarks.length > limit;
    const posts = bookmarks.slice(0, limit).map((bookmark) => bookmark.post);

    // 檢查每個貼文是否已被當前用戶按讚、轉發、加入書籤
    const postsWithStatus = await Promise.all(
      posts.map(async (post) => {
        const [isLiked, isReposted, isBookmarked] = await Promise.all([
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
          isLiked: !!isLiked,
          isReposted: !!isReposted,
          isBookmarked: !!isBookmarked,
          canDelete: post.authorId === uid,
        };
      })
    );

    return NextResponse.json({
      ok: true,
      posts: postsWithStatus,
      nextCursor: hasMore ? posts[posts.length - 1]?.id : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}


