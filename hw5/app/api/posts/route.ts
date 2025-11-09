import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createPostSchema } from '@/lib/validators/post';
import { countPostCharacters } from '@/lib/utils/post-counter';
import { handleApiError, createErrorResponse } from '@/lib/utils/api-error-handler';
import { triggerNewPostForFollowers } from '@/lib/pusher-server';

// GET: 取得文章列表（首頁 feed）
export async function GET(req: Request) {
  const session = await auth();
  if (!session || !(session as any).uid) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const uid = (session as any).uid as string;
  const { searchParams } = new URL(req.url);
  const authorId = searchParams.get('authorId'); // 如果提供，則只取得該用戶的文章
  const following = searchParams.get('following') === 'true'; // 如果為 true，則只取得已關注用戶的文章
  const limit = parseInt(searchParams.get('limit') || '20');
  const cursor = searchParams.get('cursor');

  try {
    const where: any = {
      deletedAt: null, // 只取得未刪除的文章
    };

    if (authorId) {
      where.authorId = authorId;
    } else if (following) {
      // 取得當前用戶已關注的用戶 ID
      const followingUsers = await prisma.follow.findMany({
        where: { followerId: uid },
        select: { followingId: true },
      });

      const followingIds = followingUsers.map((f) => f.followingId);
      // 如果沒有關注任何人，返回空列表
      if (followingIds.length === 0) {
        return NextResponse.json({ ok: true, posts: [] });
      }

      // 取得這些用戶發表的文章和轉發的文章
      const repostedPostIds = await prisma.repost.findMany({
        where: { userId: { in: followingIds } },
        select: { postId: true },
      });

      const repostedIds = repostedPostIds.map((r) => r.postId);
      
      // 包含原文章和轉發的文章
      where.OR = [
        { authorId: { in: followingIds } }, // 原文章
        { id: { in: repostedIds } }, // 轉發的文章
      ];
    }

         // 取得 limit + 1 條貼文，用於判斷是否還有更多貼文
    const posts = await prisma.post.findMany({
      where,
      take: limit + 1,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
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

    // 判斷是否還有更多貼文
    const hasMore = posts.length > limit;
    const postsToReturn = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore ? postsToReturn[postsToReturn.length - 1]?.id : null;

    // 檢查每個文章的按讚、轉發和書籤狀態
    const postsWithStatus = await Promise.all(
      postsToReturn.map(async (post) => {
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

    return NextResponse.json({ 
      ok: true, 
      posts: postsWithStatus,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST: 發表文章
export async function POST(req: Request) {
  const session = await auth();
  if (!session || !(session as any).uid) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

      let body;
      try {
        body = await req.json();
      } catch (error) {
        return createErrorResponse('無效的請求格式', 400, 'INVALID_JSON');
      }

      const parsed = createPostSchema.safeParse(body);
      if (!parsed.success) {
        return handleApiError(parsed.error);
      }

  const uid = (session as any).uid as string;

  // 檢查字數（考慮 URL、hashtag、mention 的特殊規則）
      const countResult = countPostCharacters(parsed.data.content ?? '');
  if (!countResult.isValid) {
    return NextResponse.json(
      { message: `Post exceeds 280 characters (current: ${countResult.count})` },
      { status: 400 }
    );
  }

  try {
         const mediaPayload = parsed.data.media ?? [];

         const post = await prisma.post.create({
           data: {
             authorId: uid,
             content: parsed.data.content?.trim() ?? '',
             media: {
               create: mediaPayload.map((item) => ({
                 url: item.url,
                 publicId: item.publicId,
                 type: item.type,
                 width: item.width ?? null,
                 height: item.height ?? null,
                 duration: item.duration ?? null,
               })),
             },
           },
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

    // 通知所有關注該用戶的人有新貼文
    try {
      const followers = await prisma.follow.findMany({
        where: { followingId: uid },
        select: { followerId: true },
      });

      // 並發通知所有關注者
      const notificationPromises = followers.map((follower) =>
        triggerNewPostForFollowers(follower.followerId, {
          postId: post.id,
          author: {
            id: post.author.id,
            name: post.author.name,
            userId: post.author.userId,
            image: post.author.image,
          },
        })
      );

      // 不等待通知完成，避免阻塞響應
      Promise.all(notificationPromises).catch((error) => {
        console.error('Error notifying followers:', error);
      });
    } catch (error) {
      // 忽略通知錯誤，不影響貼文創建
      console.error('Error notifying followers:', error);
    }

    return NextResponse.json({ ok: true, post });
  } catch (error) {
    return handleApiError(error);
  }
}
