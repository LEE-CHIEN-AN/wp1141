import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { triggerPostLikeUpdated } from '@/lib/pusher-server';
import { handleApiError } from '@/lib/utils/api-error-handler';
import { createPostLikeNotification } from '@/lib/utils/notifications';

// POST: 按讚
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
    // 檢查是否已經按讚
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId: uid,
          postId,
        },
      },
    });

    let liked = false;

    if (existingLike) {
      // 取消按讚
      await prisma.like.delete({
        where: {
          userId_postId: {
            userId: uid,
            postId,
          },
        },
      });
      liked = false;
    } else {
      // 按讚
      await prisma.like.create({
        data: {
          userId: uid,
          postId,
        },
      });
      liked = true;
      
      // 創建通知
      await createPostLikeNotification(postId, uid);
    }

    const likesCount = await prisma.like.count({ where: { postId } });
    await triggerPostLikeUpdated(postId, {
      postId,
      likes: likesCount,
      userId: uid,
      liked,
    });

    return NextResponse.json({ ok: true, liked, likes: likesCount });
  } catch (error) {
    return handleApiError(error);
  }
}

// GET: 檢查是否已按讚
export async function GET(
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
    const like = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId: uid,
          postId,
        },
      },
    });

    return NextResponse.json({ ok: true, liked: !!like });
  } catch (error) {
    return handleApiError(error);
  }
}

