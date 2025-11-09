import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/utils/api-error-handler';
import { createCommentLikeNotification } from '@/lib/utils/notifications';

// POST: 按讚留言
export async function POST(
  req: Request,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const session = await auth();
  if (!session || !(session as any).uid) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { commentId } = await params;
  const uid = (session as any).uid as string;

  try {
    // 檢查是否已經按讚
    const existingLike = await prisma.commentLike.findUnique({
      where: {
        userId_commentId: {
          userId: uid,
          commentId,
        },
      },
    });

    let liked = false;

    if (existingLike) {
      // 取消按讚
      await prisma.commentLike.delete({
        where: {
          userId_commentId: {
            userId: uid,
            commentId,
          },
        },
      });
      liked = false;
    } else {
      // 按讚
      await prisma.commentLike.create({
        data: {
          userId: uid,
          commentId,
        },
      });
      liked = true;
      
      // 創建通知
      await createCommentLikeNotification(commentId, uid);
    }

    const likesCount = await prisma.commentLike.count({ where: { commentId } });

    return NextResponse.json({ ok: true, liked, likes: likesCount });
  } catch (error) {
    return handleApiError(error);
  }
}

// GET: 檢查是否已按讚
export async function GET(
  req: Request,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const session = await auth();
  if (!session || !(session as any).uid) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { commentId } = await params;
  const uid = (session as any).uid as string;

  try {
    const like = await prisma.commentLike.findUnique({
      where: {
        userId_commentId: {
          userId: uid,
          commentId,
        },
      },
    });

    return NextResponse.json({ ok: true, liked: !!like });
  } catch (error) {
    return handleApiError(error);
  }
}

