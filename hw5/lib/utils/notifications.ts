import { prisma } from '@/lib/db';
import { NotificationType } from '@prisma/client';

/**
 * 創建通知
 */
export async function createNotification(
  userId: string, // 接收通知的用戶
  type: NotificationType,
  actorId: string, // 執行操作的用戶
  options?: {
    postId?: string;
    commentId?: string;
  }
) {
  // 如果操作者是自己，不創建通知
  if (userId === actorId) {
    return;
  }

  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        actorId,
        postId: options?.postId || null,
        commentId: options?.commentId || null,
      },
    });
  } catch (error) {
    // 忽略錯誤，避免影響主要功能
    console.error('Error creating notification:', error);
  }
}

/**
 * 創建貼文按讚通知
 */
export async function createPostLikeNotification(postId: string, actorId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });

  if (post) {
    await createNotification(post.authorId, 'POST_LIKE', actorId, { postId });
  }
}

/**
 * 創建貼文轉發通知
 */
export async function createPostRepostNotification(postId: string, actorId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });

  if (post) {
    await createNotification(post.authorId, 'POST_REPOST', actorId, { postId });
  }
}

/**
 * 創建貼文留言通知
 */
export async function createPostCommentNotification(postId: string, actorId: string, commentId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });

  if (post) {
    await createNotification(post.authorId, 'POST_COMMENT', actorId, { postId, commentId });
  }
}

/**
 * 創建留言按讚通知
 */
export async function createCommentLikeNotification(commentId: string, actorId: string) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true, postId: true },
  });

  if (comment) {
    await createNotification(comment.authorId, 'COMMENT_LIKE', actorId, {
      postId: comment.postId,
      commentId,
    });
  }
}

/**
 * 創建留言轉發通知
 */
export async function createCommentRepostNotification(commentId: string, actorId: string) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true, postId: true },
  });

  if (comment) {
    await createNotification(comment.authorId, 'COMMENT_REPOST', actorId, {
      postId: comment.postId,
      commentId,
    });
  }
}

/**
 * 創建留言回覆通知
 */
export async function createCommentReplyNotification(
  parentCommentId: string,
  actorId: string,
  replyCommentId: string,
  postId: string
) {
  const parentComment = await prisma.comment.findUnique({
    where: { id: parentCommentId },
    select: { authorId: true },
  });

  if (parentComment) {
    await createNotification(parentComment.authorId, 'COMMENT_REPLY', actorId, {
      postId,
      commentId: replyCommentId,
    });
  }
}

/**
 * 創建貼文 @mention 通知
 */
export async function createPostMentionNotification(
  postId: string,
  actorId: string,
  mentionedUserIds: string[]
) {
  // 為每個被 @mention 的用戶創建通知
  const notificationPromises = mentionedUserIds.map((userId) =>
    createNotification(userId, 'POST_MENTION' as NotificationType, actorId, { postId })
  );

  await Promise.all(notificationPromises);
}

/**
 * 創建留言 @mention 通知
 */
export async function createCommentMentionNotification(
  commentId: string,
  postId: string,
  actorId: string,
  mentionedUserIds: string[]
) {
  // 為每個被 @mention 的用戶創建通知
  const notificationPromises = mentionedUserIds.map((userId) =>
    createNotification(userId, 'COMMENT_MENTION' as NotificationType, actorId, { postId, commentId })
  );

  await Promise.all(notificationPromises);
}




