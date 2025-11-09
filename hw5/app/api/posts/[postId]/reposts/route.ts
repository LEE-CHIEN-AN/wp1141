import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError, createErrorResponse } from '@/lib/utils/api-error-handler';
import { createPostRepostNotification } from '@/lib/utils/notifications';
import { triggerNewPostForFollowers } from '@/lib/pusher-server';

// POST: 轉發
export async function POST(
  req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const session = await auth();
  if (!session || !(session as any).uid) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { postId } = await params;
  const uid = (session as any).uid as string;

  try {
    // 檢查是否已經轉發
    const existingRepost = await prisma.repost.findUnique({
      where: {
        userId_postId: {
          userId: uid,
          postId,
        },
      },
    });

    if (existingRepost) {
      return createErrorResponse('您已經轉發過這則貼文', 400, 'ALREADY_REPOSTED');
    }

    // 創建轉發
    const repost = await prisma.repost.create({
      data: {
        userId: uid,
        postId,
      },
    });

    // 創建通知
    await createPostRepostNotification(postId, uid);

    // 獲取轉發用戶的信息
    const repostUser = await prisma.user.findUnique({
      where: { id: uid },
      select: {
        id: true,
        name: true,
        userId: true,
        image: true,
      },
    });

    // 通知所有關注該用戶的人有新轉發
    if (repostUser) {
      try {
        const followers = await prisma.follow.findMany({
          where: { followingId: uid },
          select: { followerId: true },
        });

        // 並發通知所有關注者
        const notificationPromises = followers.map((follower) =>
          triggerNewPostForFollowers(follower.followerId, {
            postId,
            author: {
              id: repostUser.id,
              name: repostUser.name,
              userId: repostUser.userId,
              image: repostUser.image,
            },
          })
        );

        // 不等待通知完成，避免阻塞響應
        Promise.all(notificationPromises).catch((error) => {
          console.error('Error notifying followers about repost:', error);
        });
      } catch (error) {
        // 忽略通知錯誤，不影響轉發創建
        console.error('Error notifying followers about repost:', error);
      }
    }

    return NextResponse.json({ ok: true, repost });
  } catch (error: any) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return createErrorResponse('您已經轉發過這則貼文', 400, 'ALREADY_REPOSTED');
    }
    return handleApiError(error);
  }
}


