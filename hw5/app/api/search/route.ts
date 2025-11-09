import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/utils/api-error-handler';

type SearchType = 'top' | 'latest' | 'people' | 'media';

// GET: 搜尋貼文和用戶
export async function GET(req: Request) {
  const session = await auth();
  if (!session || !(session as any).uid) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const uid = (session as any).uid as string;
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q') || '';
  const type = (searchParams.get('type') || 'top') as SearchType;

  if (!query.trim()) {
    return NextResponse.json({ ok: true, posts: [], users: [] });
  }

  try {
    const searchTerm = query.trim().toLowerCase();

    // 搜尋用戶
    if (type === 'people') {
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { userId: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        take: 20,
        select: {
          id: true,
          name: true,
          userId: true,
          image: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ ok: true, users });
    }

    // 搜尋貼文
    const where: any = {
      deletedAt: null,
      OR: [
        { content: { contains: searchTerm, mode: 'insensitive' } },
        { content: { contains: `#${searchTerm}`, mode: 'insensitive' } },
      ],
    };

    // 如果是 media 類型，只搜尋有媒體的貼文
    if (type === 'media') {
      where.media = {
        some: {},
      };
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
      orderBy: { createdAt: 'desc' },
    });

    // 如果是 top，按互動數排序
    let posts = allPosts;
    if (type === 'top') {
      posts = allPosts.sort((a, b) => {
        const aScore = a._count.likes + a._count.comments + a._count.reposts;
        const bScore = b._count.likes + b._count.comments + b._count.reposts;
        if (bScore !== aScore) {
          return bScore - aScore;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    // 限制數量
    posts = posts.slice(0, type === 'latest' ? 50 : 20);

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

