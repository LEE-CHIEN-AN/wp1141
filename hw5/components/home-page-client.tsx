'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { InlineComposer } from './inline-composer';
import { PostItem } from './post-item';
import { useErrorToast } from './error-toast';
import { PostSkeletonList } from './post-skeleton';
import { NewPostNotice } from './new-post-notice';
import { safeApiRequest, getUserFriendlyMessage } from '@/lib/utils/error-handler';
import { getPusherClient } from '@/lib/pusher-client';
import { getFollowingChannelName } from '@/lib/pusher-channels';
import { useSession } from 'next-auth/react';
import type { PostMediaInput } from '@/lib/validators/post';

interface HomePageClientProps {
  user: {
    id: string;
    name: string | null;
    userId: string | null;
    image: string | null;
  } | null;
}

export function HomePageClient({ user }: HomePageClientProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedType, setFeedType] = useState<'all' | 'following'>('all');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [newPostAuthors, setNewPostAuthors] = useState<Array<{
    id: string;
    name: string | null;
    userId: string | null;
    image: string | null;
  }>>([]);
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const loadPostsRef = useRef<((cursor?: string | null, append?: boolean) => Promise<void>) | null>(null);
  const { showError, showSuccess, ToastContainer } = useErrorToast();

  const loadPosts = useCallback(async (cursor?: string | null, append = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setError(null);
      setHasMore(true);
    }
    
    const url = feedType === 'following' 
      ? `/api/posts?following=true${cursor ? `&cursor=${cursor}` : ''}`
      : `/api/posts${cursor ? `?cursor=${cursor}` : ''}`;
    
    const result = await safeApiRequest(url);
    
    if (result.ok && result.data) {
      const newPosts = result.data.posts || [];
      if (append) {
        setPosts((prev) => [...prev, ...newPosts]);
      } else {
        setPosts(newPosts);
      }
      setNextCursor(result.data.nextCursor || null);
      setHasMore(result.data.hasMore || false);
    } else if (result.error) {
      const message = getUserFriendlyMessage(result.error);
      if (!append) {
        setError(message);
        showError(message);
      }
    }
    
    setIsLoading(false);
    setIsLoadingMore(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedType]);

  // 更新 loadPostsRef，確保無限滾動總是使用最新的 loadPosts
  useEffect(() => {
    loadPostsRef.current = loadPosts;
  }, [loadPosts]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // 無限滾動：當滾動到底部時載入更多貼文
  useEffect(() => {
    if (!hasMore || isLoading || isLoadingMore || !nextCursor) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMore && nextCursor && !isLoadingMore && loadPostsRef.current) {
          loadPostsRef.current(nextCursor, true);
        }
      },
      {
        root: null,
        rootMargin: '100px', // 提前 100px 開始載入
        threshold: 0.1,
      }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, nextCursor, isLoading, isLoadingMore]);

  // 監聽滾動位置
  useEffect(() => {
    const handleScroll = () => {
      if (typeof window === 'undefined') return;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      // 如果滾動超過 200px，認為用戶已經往下滑動
      const scrolled = scrollTop > 200;
      setIsScrolledDown((prev) => {
        if (prev !== scrolled) {
          console.log('📜 Scroll position changed:', scrollTop, 'isScrolledDown:', scrolled);
        }
        return scrolled;
      });
    };

    // 初始檢查
    handleScroll();

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 監聽關注用戶的新貼文事件
  useEffect(() => {
    if (!user || !session) return;

    const currentUserId = (session as any)?.uid;
    if (!currentUserId) return;

    const client = getPusherClient();
    if (!client) return;

    const channelName = getFollowingChannelName(currentUserId);
    console.log('📡 Subscribing to channel:', channelName);
    const channel = (client as any).subscribe(channelName);

    // 監聽訂閱成功事件
    if (channel.on) {
      channel.on('pusher:subscription_succeeded', () => {
        console.log('✅ Successfully subscribed to channel:', channelName);
      });
      channel.on('pusher:subscription_error', (error: any) => {
        console.error('❌ Subscription error:', error);
      });
    }

    const handleNewPost = (data: {
      postId: string;
      author: {
        id: string;
        name: string | null;
        userId: string | null;
        image: string | null;
      };
    }) => {
      console.log('🔔 New post event received:', data);
      if (!data || !data.author) {
        console.log('⚠️  Invalid data or author');
        return;
      }

      // 檢查是否已經有該作者的新貼文通知
      setNewPostAuthors((prev) => {
        const exists = prev.some((author) => author.id === data.author.id);
        if (exists) {
          console.log('⚠️  Author already in list:', data.author.userId);
          return prev;
        }
        // 只保留前 2 個，加上新的作者（最多 3 個）
        const updated = [...prev, data.author].slice(-3);
        console.log('✅ Updated new post authors:', updated.map(a => a.userId));
        return updated;
      });
    };

    channel.bind('new:post', handleNewPost);

    // 在 Mock 模式下，輪詢檢查新事件
    let pollInterval: NodeJS.Timeout | null = null;
    if ((client as any).isMock) {
      console.log('🔄 Starting polling for Mock Pusher events...');
      pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/pusher/mock?channel=${encodeURIComponent(channelName)}`);
          const data = await response.json();
          if (data.ok) {
            if (data.events && data.events.length > 0) {
              console.log(`🔔 Polled ${data.events.length} new event(s):`, data.events);
              for (const mockEvent of data.events) {
                if (mockEvent.event === 'new:post' && mockEvent.payload) {
                  handleNewPost(mockEvent.payload);
                }
              }
            }
          } else {
            console.log('⚠️  Polling response not ok:', data);
          }
        } catch (error) {
          console.error('❌ Polling error:', error);
        }
      }, 1000); // 每秒輪詢一次
    }

    return () => {
      channel.unbind('new:post', handleNewPost);
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      if (typeof (client as any).unsubscribe === 'function') {
        (client as any).unsubscribe(channelName);
      } else if (typeof (channel as any).unsubscribe === 'function') {
        (channel as any).unsubscribe();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, session, feedType]);

  // 當切換 feed 類型時，清除新貼文通知
  useEffect(() => {
    setNewPostAuthors([]);
  }, [feedType]);

  // 處理點擊新貼文通知
  const handleNewPostNoticeClick = () => {
    // 滾動到頂部
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // 清除通知
    setNewPostAuthors([]);
    // 重新載入貼文
    loadPosts();
  };

  const handlePost = async ({ content, media }: { content: string; media: PostMediaInput[] }) => {
    const result = await safeApiRequest('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, media }),
    });

    if (result.ok) {
      showSuccess('貼文已發布');
      // 重新載入文章列表
      loadPosts();
      router.refresh();
    } else if (result.error) {
      const message = getUserFriendlyMessage(result.error);
      showError(message);
      throw new Error(message);
    }
  };

  const handleUpdate = () => {
    // 重新載入文章列表
    loadPosts();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black">
        <div className="mx-auto max-w-2xl p-4">
          <p className="text-[#71767A]">Please log in to continue</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-black text-white pb-16 lg:pb-0">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-[#2F3336] bg-black px-3 py-2 sm:px-4 sm:py-3">
        <h2 className="text-lg font-bold sm:text-xl">Home</h2>
      </div>

      {/* Feed Tabs */}
      <div className="sticky top-[53px] z-10 border-b border-[#2F3336] bg-black">
        <div className="mx-auto flex max-w-2xl">
          <button
            onClick={() => setFeedType('all')}
            className={`flex-1 border-b-2 px-4 py-3 font-semibold transition-colors ${
              feedType === 'all'
                ? 'border-[#1DA1F2] text-white'
                : 'border-transparent text-[#71767A] hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFeedType('following')}
            className={`flex-1 border-b-2 px-4 py-3 font-semibold transition-colors ${
              feedType === 'following'
                ? 'border-[#1DA1F2] text-white'
                : 'border-transparent text-[#71767A] hover:text-white'
            }`}
          >
            Following
          </button>
        </div>
      </div>

      {/* New Post Notice */}
      {isScrolledDown && newPostAuthors.length > 0 && (
        <div className="sticky top-[106px] z-20 px-4 py-2">
          <NewPostNotice authors={newPostAuthors} onClick={handleNewPostNoticeClick} />
        </div>
      )}
      
      {/* Debug Info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-black/80 p-4 text-xs text-white">
          <div>isScrolledDown: {isScrolledDown ? 'true' : 'false'}</div>
          <div>newPostAuthors: {newPostAuthors.length}</div>
          <div>Authors: {newPostAuthors.map(a => a.userId).join(', ')}</div>
        </div>
      )}

      {/* Inline Composer */}
      <InlineComposer
        user={{
          name: user.name,
          userId: user.userId,
          image: user.image,
        }}
        onPost={handlePost}
      />

      {/* Posts List */}
      <div className="mx-auto max-w-2xl text-white">
        {isLoading ? (
          <PostSkeletonList count={5} />
        ) : error ? (
          <div className="p-4 text-center">
            <p className="mb-4 text-red-400">{error}</p>
            <button
              onClick={() => loadPosts()}
              className="rounded-full bg-[#1DA1F2] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1a8cd8]"
            >
              重試
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="p-4 text-center text-[#71767A]">No posts yet</div>
        ) : (
          <div>
            {posts.map((post) => (
              <PostItem key={post.id} post={post} onUpdate={handleUpdate} />
            ))}
            {/* 無限滾動觸發點 */}
            {hasMore && (
              <div ref={loadMoreRef} className="py-4">
                {isLoadingMore ? (
                  <div className="text-center text-[#71767A]">
                    <PostSkeletonList count={3} />
                  </div>
                ) : (
                  <div className="h-4" /> // 佔位元素，用於觸發 IntersectionObserver
                )}
              </div>
            )}
            {/* 沒有更多貼文時顯示 */}
            {!hasMore && posts.length > 0 && (
              <div className="p-4 text-center text-[#71767A]">
                No more posts
              </div>
            )}
          </div>
        )}
      </div>
      <ToastContainer />
    </div>
  );
}
