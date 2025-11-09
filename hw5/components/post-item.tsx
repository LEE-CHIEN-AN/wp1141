'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';
import { MessageCircle, Repeat2, Heart, MoreHorizontal, Trash2, Bookmark } from 'lucide-react';
import { parsePostContent } from '@/lib/utils/post-counter';
import { useSession } from 'next-auth/react';
import { getPusherClient } from '@/lib/pusher-client';
import { getPostChannelName } from '@/lib/pusher-channels';
import { safeApiRequest, getUserFriendlyMessage } from '@/lib/utils/error-handler';

interface PostItemProps {
  post: {
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
      likes: number;
      comments: number;
      reposts: number;
    };
    isLiked?: boolean;
    isReposted?: boolean;
    isBookmarked?: boolean;
    canDelete?: boolean;
    media?: {
      id: string;
      url: string;
      publicId?: string;
      type: 'IMAGE' | 'VIDEO';
      width?: number | null;
      height?: number | null;
      duration?: number | null;
    }[];
  };
  onUpdate?: () => void;
  showComments?: boolean;
  isRepost?: boolean;
  repostedBy?: {
    id: string;
    userId: string;
  };
}

export function PostItem({ post, onUpdate, showComments = false, isRepost = false, repostedBy }: PostItemProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [isReposted, setIsReposted] = useState(post.isReposted || false);
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked || false);
  const [likeCount, setLikeCount] = useState(post._count?.likes || 0);
  const [commentCount, setCommentCount] = useState(post._count?.comments || 0);
  const [repostCount, setRepostCount] = useState(post._count?.reposts || 0);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  const currentUserId = (session as any)?.uid;
  const canDelete = post.canDelete || (currentUserId === post.author.id);
  const displayName = post.author.name || 'User';
  const avatarUrl = post.author.profile?.avatarUrl || post.author.image;
  const userId = post.author.userId;

  // 解析內容（將 URL、hashtag、mention 轉換為連結）
  const parsedContent = parsePostContent(post.content);

  // 初始化狀態
  useEffect(() => {
    if (post.isLiked !== undefined) {
      setIsLiked(post.isLiked);
    }
    if (post.isReposted !== undefined) {
      setIsReposted(post.isReposted);
    }
    if (post.isBookmarked !== undefined) {
      setIsBookmarked(post.isBookmarked);
    }
  }, [post.isLiked, post.isReposted, post.isBookmarked]);

  useEffect(() => {
    setLikeCount(post._count?.likes || 0);
  }, [post._count?.likes]);

  useEffect(() => {
    setCommentCount(post._count?.comments || 0);
  }, [post._count?.comments]);

  useEffect(() => {
    setRepostCount(post._count?.reposts || 0);
  }, [post._count?.reposts]);

  useEffect(() => {
    const client = getPusherClient();
    if (!client) {
      return;
    }

    const channelName = getPostChannelName(post.id);
    const channel = (client as any).subscribe(channelName);

    const handleLikeUpdated = (data: { postId: string; likes: number; userId?: string; liked?: boolean }) => {
      if (!data || data.postId !== post.id) return;
      setLikeCount(data.likes ?? 0);
      if (data.userId && data.userId === currentUserId && typeof data.liked === 'boolean') {
        setIsLiked(data.liked);
      }
    };

    const handleCommentCreated = (data: { postId: string; count: number; comment?: any }) => {
      if (!data || data.postId !== post.id) return;
      setCommentCount(data.count ?? 0);
      if (showComments && onUpdate) {
        onUpdate();
      }
    };

    const handlePostDeleted = (data: { postId: string }) => {
      if (!data || data.postId !== post.id) return;
      onUpdate?.();
    };

    channel.bind('like:updated', handleLikeUpdated);
    channel.bind('comment:created', handleCommentCreated);
    channel.bind('post:deleted', handlePostDeleted);

    return () => {
      channel.unbind('like:updated', handleLikeUpdated);
      channel.unbind('comment:created', handleCommentCreated);
      channel.unbind('post:deleted', handlePostDeleted);

      if (typeof (client as any).unsubscribe === 'function') {
        (client as any).unsubscribe(channelName);
      } else if (typeof (channel as any).unsubscribe === 'function') {
        (channel as any).unsubscribe();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id, showComments, onUpdate, currentUserId]);

  const handleLike = async () => {
    // 樂觀更新：立即更新 UI
    const previousLiked = isLiked;
    const previousCount = likeCount;
    const newLiked = !previousLiked;
    const newCount = newLiked ? previousCount + 1 : previousCount - 1;
    
    setIsLiked(newLiked);
    setLikeCount(newCount);

    try {
      const result = await safeApiRequest(`/api/posts/${post.id}/likes`, {
        method: 'POST',
      }, false); // 不重試，因為這是即時互動

      if (result.ok && result.data) {
        // API 成功，確保狀態正確
        setIsLiked(result.data.liked);
        setLikeCount((prev) => (result.data.liked ? prev + 1 : prev - 1));
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
      console.error('Error toggling like:', error);
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
      const result = await safeApiRequest(`/api/posts/${post.id}/reposts`, {
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

  const handleBookmark = async () => {
    // 樂觀更新：立即更新 UI
    const previousBookmarked = isBookmarked;
    const newBookmarked = !previousBookmarked;
    
    setIsBookmarked(newBookmarked);

    try {
      const result = await safeApiRequest(`/api/posts/${post.id}/bookmarks`, {
        method: 'POST',
      }, false); // 不重試

      if (result.ok && result.data) {
        // API 成功，確保狀態正確
        setIsBookmarked(result.data.bookmarked);
        onUpdate?.();
      } else {
        // API 失敗，回滾狀態
        setIsBookmarked(previousBookmarked);
      }
    } catch (error) {
      // 請求失敗，回滾狀態
      setIsBookmarked(previousBookmarked);
      console.error('Error toggling bookmark:', error);
    }
  };

  const handleDelete = async () => {
    if (!canDelete || isDeleting) return;

    if (!confirm('確定要刪除這則貼文嗎？')) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await safeApiRequest(`/api/posts/${post.id}`, {
        method: 'DELETE',
      });

      if (result.ok) {
        onUpdate?.();
        router.refresh();
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

  const handleComment = () => {
    if (showComments) {
      setShowCommentInput(true);
    } else {
      // 導向文章視圖
      router.push(`/post/${post.id}`);
    }
  };

  const handlePostComment = async () => {
    if (!commentContent.trim() || isPostingComment) return;

    // 樂觀更新：立即更新 UI
    const previousCount = commentCount;
    const contentToPost = commentContent.trim();
    
    setCommentCount(previousCount + 1);
    setCommentContent('');
    setShowCommentInput(false);
    setIsPostingComment(true);
    
    try {
      const result = await safeApiRequest(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: contentToPost }),
      });

      if (result.ok) {
        // API 成功，確保狀態正確
        onUpdate?.();
      } else {
        // API 失敗，回滾狀態
        setCommentCount(previousCount);
        setCommentContent(contentToPost);
        setShowCommentInput(true);
        const message = getUserFriendlyMessage(result.error);
        alert(message);
      }
    } catch (error) {
      // 請求失敗，回滾狀態
      setCommentCount(previousCount);
      setCommentContent(contentToPost);
      setShowCommentInput(true);
      const message = getUserFriendlyMessage(error);
      alert(message);
    } finally {
      setIsPostingComment(false);
    }
  };

  return (
    <div className="border-b border-[#2F3336] p-3 sm:p-4 text-white hover:bg-[#181818] transition-colors">
      {isRepost && repostedBy && (
        <div className="mb-2 flex items-center gap-2 text-sm text-[#71767A]">
          <Repeat2 className="h-4 w-4" />
          <Link href={`/profile/${repostedBy.userId}`} className="hover:underline">
            {repostedBy.userId}
          </Link>
          <span>轉發了</span>
        </div>
      )}
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
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
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
                      className="flex w-full items-center gap-2 px-4 py-2 text-red-500 hover:bg-[#181818] transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Post Content - 可點擊進入文章視圖 */}
          <div
            onClick={() => router.push(`/post/${post.id}`)}
            className="mb-3 cursor-pointer whitespace-pre-wrap break-words text-white"
            dangerouslySetInnerHTML={{ __html: parsedContent }}
          />

          {post.media && post.media.length > 0 && (
            <div className={`mb-3 grid gap-3 ${post.media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {post.media.map((mediaItem) => {
                const aspectRatio = mediaItem.width && mediaItem.height
                  ? `${mediaItem.width} / ${mediaItem.height}`
                  : '4 / 3';

                return (
                  <div
                    key={mediaItem.id || mediaItem.url}
                    className="relative w-full overflow-hidden rounded-2xl border border-[#2F3336]"
                    style={{ aspectRatio }}
                  >
                    {mediaItem.type === 'VIDEO' ? (
                      <video
                        controls
                        className="absolute inset-0 h-full w-full object-cover"
                        src={mediaItem.url}
                      />
                    ) : (
                      <Image
                        src={mediaItem.url}
                        alt="Post media"
                        fill
                        className="object-cover"
                        sizes="(min-width: 1024px) 30rem, 90vw"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div className="mt-3 flex items-center justify-between text-[#71767A]">
            <div className="flex items-center gap-6">
              <button
                onClick={handleComment}
                className="flex items-center gap-2 hover:text-[#1DA1F2] transition-colors"
              >
                <MessageCircle className="h-5 w-5" />
                <span>{commentCount}</span>
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
            </div>
            <button
              onClick={handleBookmark}
              className={`flex items-center gap-2 transition-colors ${
                isBookmarked ? 'text-[#1DA1F2]' : 'hover:text-[#1DA1F2]'
              }`}
            >
              <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Comment Input */}
          {showCommentInput && (
            <div className="mt-4 border-t border-[#2F3336] pt-4">
              <textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="Write a comment..."
                className="w-full resize-none rounded-lg border border-[#2F3336] bg-[#202327] p-3 text-white placeholder:text-[#71767A] focus:border-[#1DA1F2] focus:outline-none"
                rows={3}
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowCommentInput(false);
                    setCommentContent('');
                  }}
                  className="rounded-full border border-[#2F3336] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#181818]"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePostComment}
                  disabled={!commentContent.trim() || isPostingComment}
                  className="rounded-full bg-[#1DA1F2] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1a8cd8] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPostingComment ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
