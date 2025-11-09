import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/utils/api-error-handler';

type Category = 'for-you' | 'trending' | 'news' | 'sports' | 'entertainment';

// GET: 取得探索頁面的推薦內容
export async function GET(req: Request) {
  const session = await auth();
  if (!session || !(session as any).uid) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const uid = (session as any).uid as string;
  const { searchParams } = new URL(req.url);
  const category = (searchParams.get('category') || 'for-you') as Category;

  try {
    const where: any = {
      deletedAt: null,
    };

    // 根據分類過濾內容
    if (category === 'news') {
      // 新聞類別：包含新聞相關的 hashtag
      where.content = {
        contains: '#news',
      };
    } else if (category === 'sports') {
      // 運動類別：包含運動相關的 hashtag
      where.content = {
        contains: '#sports',
      };
    } else if (category === 'entertainment') {
      // 娛樂類別：包含娛樂相關的 hashtag
      where.content = {
        contains: '#entertainment',
      };
    } else if (category === 'trending') {
      // 熱門：按互動數排序
      // 這裡我們按讚數 + 留言數 + 轉發數排序
    } else {
      // For You: 推薦算法（簡化版）
      // 可以根據用戶關注的人、互動歷史等來推薦
      // 這裡先返回所有未刪除的貼文，按時間排序
    }

    // 先獲取所有符合條件的貼文
    const allPosts = await prisma.post.findMany({
      where,
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

    // 如果是 trending，按互動數排序
    let posts = allPosts;
    if (category === 'trending') {
      posts = allPosts.sort((a, b) => {
        const aScore = a._count.likes + a._count.comments + a._count.reposts;
        const bScore = b._count.likes + b._count.comments + b._count.reposts;
        if (bScore !== aScore) {
          return bScore - aScore;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } else {
      // 其他分類按時間排序
      posts = allPosts.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    // 限制數量
    posts = posts.slice(0, 20);

    // 檢查每個文章的按讚、轉發和書籤狀態
    const postsWithStatus = await Promise.all(
      posts.map(async (post) => {
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

    return NextResponse.json({ ok: true, posts: postsWithStatus });
  } catch (error) {
    return handleApiError(error);
  }
}

