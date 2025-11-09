import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError, createErrorResponse } from '@/lib/utils/api-error-handler';
import { createCommentRepostNotification } from '@/lib/utils/notifications';

// POST: 轉發留言
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
    // 檢查是否已經轉發
    const existingRepost = await prisma.commentRepost.findUnique({
      where: {
        userId_commentId: {
          userId: uid,
          commentId,
        },
      },
    });

    if (existingRepost) {
      return createErrorResponse('您已經轉發過這則留言', 400, 'ALREADY_REPOSTED');
    }

    // 創建轉發
    const repost = await prisma.commentRepost.create({
      data: {
        userId: uid,
        commentId,
      },
    });

    // 創建通知
    await createCommentRepostNotification(commentId, uid);

    return NextResponse.json({ ok: true, repost });
  } catch (error: any) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return createErrorResponse('您已經轉發過這則留言', 400, 'ALREADY_REPOSTED');
    }
    return handleApiError(error);
  }
}

