'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';
import { MessageCircle, Heart, Repeat2, MoreHorizontal, Trash2 } from 'lucide-react';
import { parsePostContent } from '@/lib/utils/post-counter';
import { safeApiRequest, getUserFriendlyMessage } from '@/lib/utils/error-handler';
import { CommentSkeletonList } from './comment-skeleton';

interface CommentItemProps {
  comment: {
    id: string;
    content: string;
    createdAt: Date;
    author: {
      id: string;
      name: string | null;
      userId: string | null;
      image: string | null;
      profile?: {
        avatarUrl: string | null;
      } | null;
    };
    _count?: {
      replies: number;
      likes?: number;
      reposts?: number;
    };
    isLiked?: boolean;
    isReposted?: boolean;
  };
  postId: string;
  currentUserId: string;
  onUpdate?: () => void;
  level?: number; // 巢狀層級
}

export function CommentItem({
  comment,
  postId,
  currentUserId,
  onUpdate,
  level = 0,
}: CommentItemProps) {
  const router = useRouter();
  const [replies, setReplies] = useState<any[]>([]);
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isPostingReply, setIsPostingReply] = useState(false);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [isLiked, setIsLiked] = useState(comment.isLiked || false);
  const [isReposted, setIsReposted] = useState(comment.isReposted || false);
  const [likeCount, setLikeCount] = useState(comment._count?.likes || 0);
  const [repostCount, setRepostCount] = useState(comment._count?.reposts || 0);
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = currentUserId === comment.author.id;
  const displayName = comment.author.name || 'User';
  const avatarUrl = comment.author.profile?.avatarUrl || comment.author.image;
  const userId = comment.author.userId;

  // 同步外部狀態
  useEffect(() => {
    setIsLiked(comment.isLiked || false);
    setIsReposted(comment.isReposted || false);
    setLikeCount(comment._count?.likes || 0);
    setRepostCount(comment._count?.reposts || 0);
  }, [comment.isLiked, comment.isReposted, comment._count?.likes, comment._count?.reposts]);

  // 解析內容
  const parsedContent = parsePostContent(comment.content);

  // 載入回覆
  const loadReplies = async () => {
    setIsLoadingReplies(true);
    try {
      const result = await safeApiRequest(`/api/posts/${postId}/comments?parentId=${comment.id}`);
      if (result.ok && result.data) {
        setReplies(result.data.comments || []);
      }
    } catch (error) {
      console.error('Error loading replies:', error);
    } finally {
      setIsLoadingReplies(false);
    }
  };

  useEffect(() => {
    if (showReplies && comment._count?.replies && comment._count.replies > 0) {
      loadReplies();
    }
  }, [showReplies, comment.id, postId]);

  const handleReply = () => {
    setShowReplyInput(true);
  };

  const handlePostReply = async () => {
    if (!replyContent.trim() || isPostingReply) return;

    setIsPostingReply(true);
    try {
      const result = await safeApiRequest(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent, parentId: comment.id }),
      });

      if (result.ok) {
        setReplyContent('');
        setShowReplyInput(false);
        setShowReplies(true);
        loadReplies();
        onUpdate?.();
      } else if (result.error) {
        const message = getUserFriendlyMessage(result.error);
        alert(message);
      }
    } catch (error) {
      const message = getUserFriendlyMessage(error);
      alert(message);
    } finally {
      setIsPostingReply(false);
    }
  };

  const handleCommentClick = () => {
    // 點擊留言進入該留言視圖（巢狀路由）
    router.push(`/post/${postId}/comment/${comment.id}`);
  };

  const handleLike = async () => {
    // 樂觀更新：立即更新 UI
    const previousLiked = isLiked;
    const previousCount = likeCount;
    const newLiked = !previousLiked;
    const newCount = newLiked ? previousCount + 1 : previousCount - 1;
    
    setIsLiked(newLiked);
    setLikeCount(newCount);

    try {
      const result = await safeApiRequest(`/api/comments/${comment.id}/likes`, {
        method: 'POST',
      }, false); // 不重試，因為這是即時互動

      if (result.ok && result.data) {
        // API 成功，確保狀態正確
        setIsLiked(result.data.liked);
        setLikeCount(result.data.likes);
        onUpdate?.();
      } else {
        // API 失敗，回滾狀態
        setIsLiked(previousLiked);
        setLikeCount(previousCount);
      }
    } catch (error) {
      // 請求失敗，回滾狀態
      setIsLiked(previousLiked);
      setLikeCount(previousCount);
      console.error('Error toggling comment like:', error);
    }
  };

  const handleRepost = async () => {
    if (isReposted) return; // 已轉發，不能取消

    // 樂觀更新：立即更新 UI
    const previousReposted = isReposted;
    const previousCount = repostCount;
    
    setIsReposted(true);
    setRepostCount(previousCount + 1);

    try {
      const result = await safeApiRequest(`/api/comments/${comment.id}/reposts`, {
        method: 'POST',
      }, false); // 不重試

      if (result.ok) {
        // API 成功，確保狀態正確
        onUpdate?.();
      } else {
        // API 失敗，回滾狀態
        setIsReposted(previousReposted);
        setRepostCount(previousCount);
        const message = getUserFriendlyMessage(result.error);
        alert(message);
      }
    } catch (error) {
      // 請求失敗，回滾狀態
      setIsReposted(previousReposted);
      setRepostCount(previousCount);
      const message = getUserFriendlyMessage(error);
      alert(message);
    }
  };

  const handleDelete = async () => {
    if (!canDelete || isDeleting) return;

    // 如果有回覆，提示用戶
    if (comment._count?.replies && comment._count.replies > 0) {
      alert('無法刪除有回覆的留言');
      setShowDeleteMenu(false);
      return;
    }

    if (!confirm('確定要刪除這則留言嗎？')) {
      setShowDeleteMenu(false);
      return;
    }

    setIsDeleting(true);
    try {
      const result = await safeApiRequest(`/api/comments/${comment.id}`, {
        method: 'DELETE',
      });

      if (result.ok) {
        onUpdate?.();
        // 如果是在留言詳情頁面，返回上一頁
        if (window.location.pathname.includes(`/comment/${comment.id}`)) {
          router.back();
        }
      } else if (result.error) {
        const message = getUserFriendlyMessage(result.error);
        alert(message);
      }
    } catch (error) {
      const message = getUserFriendlyMessage(error);
      alert(message);
    } finally {
      setIsDeleting(false);
      setShowDeleteMenu(false);
    }
  };

  return (
    <div className={`border-b border-[#2F3336] p-3 sm:p-4 text-white ${level > 0 ? 'ml-4 sm:ml-8 border-l-2 border-[#2F3336]' : ''}`}>
      <div className="flex gap-3">
        {/* Avatar */}
        {avatarUrl ? (
          <Link href={userId ? `/profile/${userId}` : '#'}>
            <Image
              src={avatarUrl}
              alt={displayName}
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover"
            />
          </Link>
        ) : (
          <Link href={userId ? `/profile/${userId}` : '#'}>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2F3336] text-white">
              {displayName[0]?.toUpperCase() || 'U'}
            </div>
          </Link>
        )}

        {/* Content */}
        <div className="flex-1">
          {/* User Info */}
          <div className="mb-1 flex items-center gap-2">
            <Link
              href={userId ? `/profile/${userId}` : '#'}
              className="font-semibold hover:underline"
            >
              {displayName}
            </Link>
            {userId && (
              <Link
                href={`/profile/${userId}`}
                className="text-[#71767A] hover:underline"
              >
                @{userId}
              </Link>
            )}
            <span className="text-[#71767A]">·</span>
            <span className="text-[#71767A] text-sm">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
            {canDelete && (
              <div className="relative ml-auto">
                <button
                  onClick={() => setShowDeleteMenu(!showDeleteMenu)}
                  className="rounded-full p-1 text-[#71767A] hover:bg-[#181818] transition-colors"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
                {showDeleteMenu && (
                  <div className="absolute right-0 top-8 z-10 rounded-lg border border-[#2F3336] bg-[#202327] shadow-lg">
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="flex w-full items-center gap-2 px-4 py-2 text-red-500 hover:bg-[#181818] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Comment Content - 可點擊進入留言視圖 */}
          <div
            onClick={handleCommentClick}
            className="mb-3 cursor-pointer text-white whitespace-pre-wrap break-words hover:bg-[#181818] rounded p-2 transition-colors"
            dangerouslySetInnerHTML={{ __html: parsedContent }}
          />

          {/* Actions */}
          <div className="mt-3 flex items-center gap-6 text-[#71767A]">
            <button
              onClick={handleReply}
              className="flex items-center gap-2 hover:text-[#1DA1F2] transition-colors"
            >
              <MessageCircle className="h-5 w-5" />
              <span>Reply</span>
            </button>
            <button
              onClick={handleRepost}
              disabled={isReposted}
              className={`flex items-center gap-2 transition-colors ${
                isReposted
                  ? 'text-[#1DA1F2] cursor-not-allowed'
                  : 'hover:text-[#1DA1F2]'
              }`}
            >
              <Repeat2 className="h-5 w-5" />
              <span>{repostCount}</span>
            </button>
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 transition-colors ${
                isLiked ? 'text-red-500' : 'hover:text-red-500'
              }`}
            >
              <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
              <span>{likeCount}</span>
            </button>
            {comment._count?.replies && comment._count.replies > 0 && (
              <button
                onClick={() => {
                  setShowReplies(!showReplies);
                  if (!showReplies) {
                    loadReplies();
                  }
                }}
                className="text-sm text-[#1DA1F2] hover:underline"
              >
                {showReplies ? 'Hide' : 'Show'} {comment._count.replies} replies
              </button>
            )}
          </div>

          {/* Reply Input */}
          {showReplyInput && (
            <div className="mt-4 border-t border-[#2F3336] pt-4">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="w-full resize-none rounded-lg border border-[#2F3336] bg-[#202327] p-3 text-white placeholder:text-[#71767A] focus:border-[#1DA1F2] focus:outline-none"
                rows={3}
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowReplyInput(false);
                    setReplyContent('');
                  }}
                  className="rounded-full border border-[#2F3336] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#181818]"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePostReply}
                  disabled={!replyContent.trim() || isPostingReply}
                  className="rounded-full bg-[#1DA1F2] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1a8cd8] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPostingReply ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          )}

          {/* Replies */}
          {showReplies && (
            <div className="mt-4">
              {isLoadingReplies ? (
                <CommentSkeletonList count={2} level={level + 1} />
              ) : replies.length > 0 ? (
                replies.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    postId={postId}
                    currentUserId={currentUserId}
                    onUpdate={onUpdate}
                    level={level + 1}
                  />
                ))
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

