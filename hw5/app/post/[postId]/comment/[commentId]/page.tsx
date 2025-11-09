import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { CommentDetailPageClient } from '@/components/comment-detail-page-client';

export default async function CommentDetailPage({
  params,
}: {
  params: Promise<{ postId: string; commentId: string }>;
}) {
  const { postId, commentId } = await params;
  const session = await auth();

  if (!session || !(session as any).uid) {
    redirect('/login');
  }

  const uid = (session as any).uid as string;

  try {
    // 取得留言資料
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            userId: true,
            image: true,
          },
        },
        post: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                userId: true,
                image: true,
              },
            },
            media: {
              orderBy: { createdAt: 'asc' },
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

    if (!comment || comment.postId !== postId) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-gray-600">Comment not found</p>
        </div>
      );
    }

    // 檢查是否已按讚和轉發
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

    // 取得該留言的回覆
    const replies = await prisma.comment.findMany({
      where: {
        postId,
        parentId: commentId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            userId: true,
            image: true,
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

    // 檢查每個回覆的按讚和轉發狀態
    const repliesWithStatus = await Promise.all(
      replies.map(async (reply) => {
        const [replyLike, replyRepost] = await Promise.all([
          prisma.commentLike.findUnique({
            where: {
              userId_commentId: {
                userId: uid,
                commentId: reply.id,
              },
            },
          }),
          prisma.commentRepost.findUnique({
            where: {
              userId_commentId: {
                userId: uid,
                commentId: reply.id,
              },
            },
          }),
        ]);

        return {
          ...reply,
          isLiked: !!replyLike,
          isReposted: !!replyRepost,
        };
      })
    );

    return (
      <CommentDetailPageClient
        comment={{
          ...comment,
          isLiked: !!like,
          isReposted: !!repost,
        }}
        replies={repliesWithStatus}
        currentUserId={uid}
      />
    );
  } catch (error) {
    console.error('Error fetching comment:', error);
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Error loading comment</p>
      </div>
    );
  }
}


