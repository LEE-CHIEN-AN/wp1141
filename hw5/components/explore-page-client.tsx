'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Settings, Hash } from 'lucide-react';
import { PostItem } from './post-item';
import { PostSkeletonList } from './post-skeleton';
import { useErrorToast } from './error-toast';
import { safeApiRequest, getUserFriendlyMessage } from '@/lib/utils/error-handler';

interface ExplorePageClientProps {
  user: {
    id: string;
    name: string | null;
    userId: string | null;
    image: string | null;
  } | null;
}

type Category = 'for-you' | 'trending' | 'news' | 'sports' | 'entertainment';

interface TrendingItem {
  tag: string;
  count: number;
}

interface NewsItem {
  id: string;
  title: string;
  description: string;
  category: string;
  timeAgo: string;
  postsCount: number;
  thumbnail?: string;
}

export function ExplorePageClient({ user }: ExplorePageClientProps) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<Category>('for-you');
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState<any[]>([]);
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTrending, setIsLoadingTrending] = useState(true);
  const [isLoadingNews, setIsLoadingNews] = useState(true);
  const { showError, ToastContainer } = useErrorToast();

  const categories = [
    { id: 'for-you' as Category, label: 'For You' },
    { id: 'trending' as Category, label: 'Trending' },
    { id: 'news' as Category, label: 'News' },
    { id: 'sports' as Category, label: 'Sports' },
    { id: 'entertainment' as Category, label: 'Entertainment' },
  ];

  // 載入推薦內容
  const loadExploreContent = async () => {
    setIsLoading(true);
    try {
      const result = await safeApiRequest(`/api/explore?category=${activeCategory}`);
      if (result.ok && result.data) {
        setPosts(result.data.posts || []);
      } else if (result.error) {
        const message = getUserFriendlyMessage(result.error);
        showError(message);
      }
    } catch (error) {
      console.error('Error loading explore content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 載入熱門話題
  const loadTrending = async () => {
    setIsLoadingTrending(true);
    try {
      const result = await safeApiRequest('/api/hashtags/trending');
      if (result.ok && result.data) {
        setTrending(result.data.trending || []);
      }
    } catch (error) {
      console.error('Error loading trending:', error);
    } finally {
      setIsLoadingTrending(false);
    }
  };

  // 載入今日新聞
  const loadNews = async () => {
    setIsLoadingNews(true);
    try {
      const result = await safeApiRequest('/api/explore/news');
      if (result.ok && result.data) {
        setNews(result.data.news || []);
      }
    } catch (error) {
      console.error('Error loading news:', error);
    } finally {
      setIsLoadingNews(false);
    }
  };

  useEffect(() => {
    loadExploreContent();
  }, [activeCategory]);

  useEffect(() => {
    loadTrending();
    loadNews();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleUpdate = () => {
    loadExploreContent();
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
    <div className="min-h-screen bg-black text-white pb-16 lg:pb-0">
      <ToastContainer />
      
      {/* Search Bar */}
      <div className="sticky top-0 z-10 border-b border-[#2F3336] bg-black px-4 py-3">
        <form onSubmit={handleSearch} className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#71767A]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            className="w-full rounded-full border border-[#2F3336] bg-[#202327] py-2 pl-10 pr-10 text-white placeholder:text-[#71767A] focus:border-[#1DA1F2] focus:bg-black focus:outline-none focus:ring-2 focus:ring-[#1DA1F2]"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#71767A] hover:bg-[#181818] transition-colors"
          >
            <Settings className="h-5 w-5" />
          </button>
        </form>
      </div>

      {/* Category Tabs */}
      <div className="sticky top-[57px] z-10 border-b border-[#2F3336] bg-black">
        <div className="flex overflow-x-auto">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`flex-shrink-0 border-b-2 px-4 py-3 font-semibold transition-colors ${
                activeCategory === category.id
                  ? 'border-[#1DA1F2] text-white'
                  : 'border-transparent text-[#71767A] hover:text-white'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-2xl">
        {/* Today's News Section */}
        {activeCategory === 'for-you' && (
          <div className="border-b border-[#2F3336] p-4">
            <h2 className="mb-4 text-xl font-bold">Today's News</h2>
            {isLoadingNews ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-[#2F3336]" />
                      <div className="h-3 w-full animate-pulse rounded bg-[#2F3336]" />
                      <div className="h-3 w-2/3 animate-pulse rounded bg-[#2F3336]" />
                      <div className="flex gap-2">
                        <div className="h-3 w-16 animate-pulse rounded bg-[#2F3336]" />
                        <div className="h-3 w-20 animate-pulse rounded bg-[#2F3336]" />
                      </div>
                    </div>
                    <div className="h-20 w-20 animate-pulse rounded-lg bg-[#2F3336]" />
                  </div>
                ))}
              </div>
            ) : news.length > 0 ? (
              <div className="space-y-4">
                {news.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => router.push(`/hashtag/${encodeURIComponent(item.category.toLowerCase())}`)}
                    className="flex w-full gap-4 rounded-lg p-3 text-left transition-colors hover:bg-[#181818]"
                  >
                    <div className="flex-1">
                      <h3 className="mb-1 font-semibold text-white line-clamp-2">{item.title}</h3>
                      <p className="mb-2 text-sm text-[#71767A] line-clamp-2">{item.description}</p>
                      <div className="flex items-center gap-2 text-xs text-[#71767A]">
                        <span>{item.timeAgo}</span>
                        <span>·</span>
                        <span className="capitalize">{item.category}</span>
                        <span>·</span>
                        <span>{item.postsCount.toLocaleString()} posts</span>
                      </div>
                    </div>
                    {item.thumbnail && (
                      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-[#2F3336]">
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-[#71767A]">No news available</div>
            )}
          </div>
        )}

        {/* Trending in Taiwan Section */}
        {activeCategory === 'trending' && (
          <div className="border-b border-[#2F3336] p-4">
            <h2 className="mb-4 text-xl font-bold">Trending in Taiwan</h2>
            {isLoadingTrending ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-pulse rounded bg-[#2F3336]" />
                    <div className="h-4 w-32 animate-pulse rounded bg-[#2F3336]" />
                    <div className="ml-auto h-3 w-16 animate-pulse rounded bg-[#2F3336]" />
                  </div>
                ))}
              </div>
            ) : trending.length > 0 ? (
              <div className="space-y-1">
                {trending.map((item, index) => (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={() => router.push(`/hashtag/${encodeURIComponent(item.tag)}`)}
                    className="flex w-full items-start justify-between rounded-lg p-3 text-left transition-colors hover:bg-[#181818]"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-1 text-sm font-semibold text-[#71767A]">{index + 1}</span>
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <Hash className="h-4 w-4 text-[#71767A]" />
                          <span className="font-semibold text-white">#{item.tag}</span>
                        </div>
                        <div className="text-xs text-[#71767A]">{item.count.toLocaleString()} posts</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-[#71767A]">No trending topics</div>
            )}
          </div>
        )}

        {/* Posts Feed */}
        <div className="border-b border-[#2F3336]">
          {isLoading ? (
            <PostSkeletonList count={5} />
          ) : posts.length === 0 ? (
            <div className="p-8 text-center text-[#71767A]">No posts found</div>
          ) : (
            <div>
              {posts.map((post) => (
                <PostItem key={post.id} post={post} onUpdate={handleUpdate} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

