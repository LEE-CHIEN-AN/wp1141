import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/utils/api-error-handler';

// GET: 取得用戶的所有公開內容（原創文章 + 轉發的貼文 + 轉發的留言）
export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session || !(session as any).uid) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { userId: targetUserId } = await params;
  const currentUserId = (session as any).uid as string;

  try {
    // 取得目標用戶的 ID
    const targetUser = await prisma.user.findUnique({
      where: { userId: targetUserId },
      select: { id: true },
    });

    if (!targetUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const targetUserDbId = targetUser.id;

    // 1. 取得用戶自己發表的文章
    const originalPosts = await prisma.post.findMany({
      where: {
        authorId: targetUserDbId,
        deletedAt: null,
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

    // 2. 取得用戶轉發的貼文
    const reposts = await prisma.repost.findMany({
      where: {
        userId: targetUserDbId,
        post: {
          deletedAt: null, // 只取得未刪除的貼文
        },
      },
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

    // 3. 取得用戶轉發的留言
    const commentReposts = await prisma.commentRepost.findMany({
      where: {
        userId: targetUserDbId,
      },
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

    // 檢查每個原創文章的按讚、轉發和書籤狀態
    const originalPostsWithStatus = await Promise.all(
      originalPosts.map(async (post) => {
        const [like, repost, bookmark] = await Promise.all([
          prisma.like.findUnique({
            where: {
              userId_postId: {
                userId: currentUserId,
                postId: post.id,
              },
            },
          }),
          prisma.repost.findUnique({
            where: {
              userId_postId: {
                userId: currentUserId,
                postId: post.id,
              },
            },
          }),
          prisma.bookmark.findUnique({
            where: {
              userId_postId: {
                userId: currentUserId,
                postId: post.id,
              },
            },
          }),
        ]);

        return {
          type: 'post' as const,
          id: post.id,
          createdAt: post.createdAt,
          isRepost: false,
          item: {
            ...post,
            isLiked: !!like,
            isReposted: !!repost,
            isBookmarked: !!bookmark,
            canDelete: post.authorId === currentUserId,
          },
        };
      })
    );

    // 處理轉發的貼文
    const repostedPostsWithStatus = await Promise.all(
      reposts
        .filter((r) => r.post && r.post.deletedAt === null) // 過濾掉已刪除的貼文
        .map(async (repost) => {
          const [like, reposted, bookmark] = await Promise.all([
            prisma.like.findUnique({
              where: {
                userId_postId: {
                  userId: currentUserId,
                  postId: repost.post.id,
                },
              },
            }),
            prisma.repost.findUnique({
              where: {
                userId_postId: {
                  userId: currentUserId,
                  postId: repost.post.id,
                },
              },
            }),
            prisma.bookmark.findUnique({
              where: {
                userId_postId: {
                  userId: currentUserId,
                  postId: repost.post.id,
                },
              },
            }),
          ]);

          return {
            type: 'post' as const,
            id: repost.post.id,
            createdAt: repost.createdAt, // 使用轉發時間
            isRepost: true,
            repostedBy: {
              id: targetUserDbId,
              userId: targetUserId,
            },
            item: {
              ...repost.post,
              isLiked: !!like,
              isReposted: !!reposted,
              isBookmarked: !!bookmark,
              canDelete: repost.post.authorId === currentUserId,
            },
          };
        })
    );

    // 處理轉發的留言
    const repostedCommentsWithStatus = await Promise.all(
      commentReposts.map(async (repost) => {
        // 檢查當前用戶是否已按讚或轉發該留言
        const [like, commentRepost] = await Promise.all([
          prisma.commentLike.findUnique({
            where: {
              userId_commentId: {
                userId: currentUserId,
                commentId: repost.comment.id,
              },
            },
          }),
          prisma.commentRepost.findUnique({
            where: {
              userId_commentId: {
                userId: currentUserId,
                commentId: repost.comment.id,
              },
            },
          }),
        ]);

        return {
          type: 'comment' as const,
          id: repost.comment.id,
          createdAt: repost.createdAt, // 使用轉發時間
          isRepost: true,
          repostedBy: {
            id: targetUserDbId,
            userId: targetUserId,
          },
          item: {
            ...repost.comment,
            isLiked: !!like,
            isReposted: !!commentRepost,
          },
        };
      })
    );

    // 合併所有內容並按時間排序
    const allContent = [
      ...originalPostsWithStatus,
      ...repostedPostsWithStatus,
      ...repostedCommentsWithStatus,
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return NextResponse.json({ ok: true, content: allContent });
  } catch (error) {
    return handleApiError(error);
  }
}

