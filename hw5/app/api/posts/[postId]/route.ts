import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { triggerPostDeleted } from '@/lib/pusher-server';
import { handleApiError, createErrorResponse } from '@/lib/utils/api-error-handler';

// GET: 取得單篇文章
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
    const post = await prisma.post.findUnique({
      where: { id: postId },
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

    if (!post || post.deletedAt) {
      return NextResponse.json({ message: 'Post not found' }, { status: 404 });
    }

    // 檢查是否已按讚、轉發和書籤
    const [like, repost, bookmark] = await Promise.all([
      prisma.like.findUnique({
        where: {
          userId_postId: {
            userId: uid,
            postId,
          },
        },
      }),
      prisma.repost.findUnique({
        where: {
          userId_postId: {
            userId: uid,
            postId,
          },
        },
      }),
      prisma.bookmark.findUnique({
        where: {
          userId_postId: {
            userId: uid,
            postId,
          },
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      post: {
        ...post,
        isLiked: !!like,
        isReposted: !!repost,
        isBookmarked: !!bookmark,
        canDelete: post.authorId === uid, // 只有作者可以刪除
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE: 刪除文章（僅作者可刪除）
export async function DELETE(
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
    // 檢查文章是否存在且為作者
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });

    if (!post) {
      return NextResponse.json({ message: 'Post not found' }, { status: 404 });
    }

    if (post.authorId !== uid) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // 軟刪除（設置 deletedAt）
    await prisma.post.update({
      where: { id: postId },
      data: { deletedAt: new Date() },
    });

    await triggerPostDeleted(postId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

