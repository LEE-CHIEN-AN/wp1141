import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createPostSchema } from '@/lib/validators/post';
import { countPostCharacters } from '@/lib/utils/post-counter';
import { triggerPostCommentCreated } from '@/lib/pusher-server';
import { handleApiError, createErrorResponse } from '@/lib/utils/api-error-handler';
import { createPostCommentNotification, createCommentReplyNotification } from '@/lib/utils/notifications';

// GET: 取得留言列表
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
  const { searchParams } = new URL(req.url);
  const parentId = searchParams.get('parentId'); // 如果提供，則只取得該留言的子留言

  try {
    const where: any = {
      postId,
      parentId: parentId || null, // 如果沒有 parentId，則取得頂層留言
    };

    const comments = await prisma.comment.findMany({
      where,
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
        _count: {
          select: {
            replies: true,
            likes: true,
            reposts: true,
          },
        },
      },
    });

    // 檢查每個留言的按讚和轉發狀態
    const commentsWithStatus = await Promise.all(
      comments.map(async (comment) => {
        const [like, repost] = await Promise.all([
          prisma.commentLike.findUnique({
            where: {
              userId_commentId: {
                userId: uid,
                commentId: comment.id,
              },
            },
          }),
          prisma.commentRepost.findUnique({
            where: {
              userId_commentId: {
                userId: uid,
                commentId: comment.id,
              },
            },
          }),
        ]);

        return {
          ...comment,
          isLiked: !!like,
          isReposted: !!repost,
        };
      })
    );

    return NextResponse.json({ ok: true, comments: commentsWithStatus });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST: 發表留言
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

  // 留言必須有內容
  const content = parsed.data.content ?? '';
  if (!content.trim()) {
    return NextResponse.json(
      { message: 'Comment content is required' },
      { status: 400 }
    );
  }

  // 檢查字數
  const countResult = countPostCharacters(content);
  if (!countResult.isValid) {
    return NextResponse.json(
      { message: `Comment exceeds 280 characters (current: ${countResult.count})` },
      { status: 400 }
    );
  }

  try {
    const comment = await prisma.comment.create({
      data: {
        postId,
        authorId: uid,
        content,
        parentId: body.parentId || null, // 如果提供 parentId，則是回覆留言
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
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    const count = await prisma.comment.count({ where: { postId } });

    await triggerPostCommentCreated(postId, {
      postId,
      comment,
      count,
    });

    // 創建通知
    if (comment.parentId) {
      // 如果是回覆留言，通知父留言的作者
      await createCommentReplyNotification(comment.parentId, uid, comment.id, postId);
    } else {
      // 如果是直接留言貼文，通知貼文作者
      await createPostCommentNotification(postId, uid, comment.id);
    }

    return NextResponse.json({ ok: true, comment, count });
  } catch (error) {
    return handleApiError(error);
  }
}

