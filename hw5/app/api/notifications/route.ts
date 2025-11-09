import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/utils/api-error-handler';

// GET: 取得通知列表
export async function GET(req: Request) {
  const session = await auth();
  if (!session || !(session as any).uid) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const uid = (session as any).uid as string;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'all'; // all, verified, mentions
  const limit = parseInt(searchParams.get('limit') || '20');

  try {
    // 獲取當前用戶的 userId
    const currentUser = await prisma.user.findUnique({
      where: { id: uid },
      select: { userId: true },
    });

    const currentUserId = currentUser?.userId;

    const where: any = {
      userId: uid,
    };

    // 根據類型過濾
    if (type === 'verified') {
      // 只顯示已驗證用戶的通知
      where.actor = {
        verified: true,
      };
    } else if (type === 'mentions') {
      // 只顯示提到用戶的通知（需要檢查 post.content 或 comment.content）
      // 這個過濾會在查詢後進行，因為 Prisma 不支持在關聯的內容中進行文本搜索
      where.userId = uid;
    }

    const notifications = await prisma.notification.findMany({
      where,
      take: type === 'mentions' ? limit * 2 : limit, // 對於 mentions，先獲取更多以便過濾
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
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
                profile: {
                  select: {
                    avatarUrl: true,
                  },
                },
              },
            },
            media: {
              take: 1,
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
        comment: {
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
              },
            },
            _count: {
              select: {
                likes: true,
                replies: true,
                reposts: true,
              },
            },
          },
        },
      },
    });

    // 對於 Mentions 類型，過濾出內容中包含 @userId 的通知
    let filteredNotifications = notifications;
    if (type === 'mentions' && currentUserId) {
      const mentionRegex = new RegExp(`@${currentUserId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      filteredNotifications = notifications.filter((notification) => {
        // 檢查 post 內容
        if (notification.post?.content) {
          if (mentionRegex.test(notification.post.content)) {
            return true;
          }
        }
        // 檢查 comment 內容
        if (notification.comment?.content) {
          if (mentionRegex.test(notification.comment.content)) {
            return true;
          }
        }
        return false;
      });
      // 限制返回數量
      filteredNotifications = filteredNotifications.slice(0, limit);
    }

    return NextResponse.json({ ok: true, notifications: filteredNotifications });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH: 標記通知為已讀
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session || !(session as any).uid) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const uid = (session as any).uid as string;

  try {
    const body = await req.json();
    const { notificationId, markAllAsRead } = body;

    if (markAllAsRead) {
      // 標記所有通知為已讀
      await prisma.notification.updateMany({
        where: {
          userId: uid,
          read: false,
        },
        data: {
          read: true,
        },
      });

      return NextResponse.json({ ok: true });
    } else if (notificationId) {
      // 標記單個通知為已讀
      await prisma.notification.update({
        where: {
          id: notificationId,
          userId: uid, // 確保只能標記自己的通知
        },
        data: {
          read: true,
        },
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}

