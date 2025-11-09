import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/utils/api-error-handler';

// GET: 取得當前用戶按讚的貼文和留言
export async function GET(req: Request) {
  const session = await auth();
  if (!session || !(session as any).uid) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const uid = (session as any).uid as string;
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '50');

  try {
    // 取得按讚的貼文
    const likedPosts = await prisma.like.findMany({
      where: { userId: uid },
      take: limit * 2, // 取得更多以確保有足夠的結果
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

    // 取得按讚的留言
    const likedComments = await prisma.commentLike.findMany({
      where: { userId: uid },
      take: limit * 2, // 取得更多以確保有足夠的結果
      orderBy: { createdAt: 'desc' },
      include: {
        comment: {
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
            post: {
              select: {
                id: true,
                content: true,
                createdAt: true,
                author: {
                  select: {
                    id: true,
                    name: true,
                    userId: true,
                    image: true,
                  },
                },
              },
            },
            _count: {
              select: {
                replies: true,
                likes: true,
                reposts: true,
              },
            },
          },
        },
      },
    });

    // 合併並排序（按時間降序）
    const allLikes = [
      ...likedPosts.map((like) => ({
        type: 'post' as const,
        id: like.post.id,
        createdAt: like.createdAt,
        item: {
          ...like.post,
          isLiked: true,
          isReposted: false,
          canDelete: like.post.authorId === uid,
        },
      })),
      ...likedComments.map((like) => ({
        type: 'comment' as const,
        id: like.comment.id,
        createdAt: like.createdAt,
        item: {
          ...like.comment,
          isLiked: true,
          isReposted: false,
        },
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return NextResponse.json({ ok: true, likes: allLikes.slice(0, limit) });
  } catch (error) {
    return handleApiError(error);
  }
}

