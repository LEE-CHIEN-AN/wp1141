import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError, createErrorResponse } from '@/lib/utils/api-error-handler';

// DELETE: 刪除留言（僅作者可刪除，且不能有回覆）
export async function DELETE(
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
    // 檢查留言是否存在且為作者
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: {
        authorId: true,
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    if (!comment) {
      return NextResponse.json({ message: 'Comment not found' }, { status: 404 });
    }

    if (comment.authorId !== uid) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // 如果有回覆，不允許刪除
    if (comment._count.replies > 0) {
      return NextResponse.json(
        { message: 'Cannot delete comment with replies' },
        { status: 400 }
      );
    }

    // 刪除留言（硬刪除，因為沒有回覆）
    await prisma.comment.delete({
      where: { id: commentId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

