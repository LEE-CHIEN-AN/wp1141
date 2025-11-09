import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { PostDetailPageClient } from '@/components/post-detail-page-client';

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const session = await auth();

  if (!session || !(session as any).uid) {
    redirect('/login');
  }

  const uid = (session as any).uid as string;

  try {
    // 取得文章資料
    const post = await prisma.post.findUnique({
      where: { id: postId },
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
      return (
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-gray-600">Post not found</p>
        </div>
      );
    }

    // 檢查是否已按讚
    const like = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId: uid,
          postId,
        },
      },
    });

    // 檢查是否已轉發
    const repost = await prisma.repost.findUnique({
      where: {
        userId_postId: {
          userId: uid,
          postId,
        },
      },
    });

    // 取得頂層留言
    const comments = await prisma.comment.findMany({
      where: {
        postId,
        parentId: null, // 只取得頂層留言
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

    // 檢查每個留言的按讚和轉發狀態
    const commentsWithStatus = await Promise.all(
      comments.map(async (comment) => {
        const [commentLike, commentRepost] = await Promise.all([
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
          isLiked: !!commentLike,
          isReposted: !!commentRepost,
        };
      })
    );

    return (
      <PostDetailPageClient
        post={{
          ...post,
          isLiked: !!like,
          isReposted: !!repost,
          canDelete: post.authorId === uid,
        }}
        initialComments={commentsWithStatus}
        currentUserId={uid}
      />
    );
  } catch (error) {
    console.error('Error fetching post:', error);
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Error loading post</p>
      </div>
    );
  }
}


