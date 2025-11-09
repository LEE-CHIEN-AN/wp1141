'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, ArrowLeft } from 'lucide-react';
import { PostItem } from './post-item';
import { PostSkeletonList } from './post-skeleton';
import { useErrorToast } from './error-toast';
import { safeApiRequest, getUserFriendlyMessage } from '@/lib/utils/error-handler';

interface SearchPageClientProps {
  user: {
    id: string;
    name: string | null;
    userId: string | null;
    image: string | null;
  } | null;
  initialQuery: string;
}

type SearchType = 'top' | 'latest' | 'people' | 'media';

export function SearchPageClient({ user, initialQuery }: SearchPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeType, setActiveType] = useState<SearchType>('top');
  const [posts, setPosts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { showError, ToastContainer } = useErrorToast();

  const searchTypes = [
    { id: 'top' as SearchType, label: 'Top' },
    { id: 'latest' as SearchType, label: 'Latest' },
    { id: 'people' as SearchType, label: 'People' },
    { id: 'media' as SearchType, label: 'Media' },
  ];

  // 載入搜尋結果
  const loadSearchResults = async () => {
    if (!searchQuery.trim()) {
      setPosts([]);
      setUsers([]);
      return;
    }

    setIsLoading(true);
    try {
      const result = await safeApiRequest(
        `/api/search?q=${encodeURIComponent(searchQuery.trim())}&type=${activeType}`
      );
      
      if (result.ok && result.data) {
        if (activeType === 'people') {
          setUsers(result.data.users || []);
          setPosts([]);
        } else {
          setPosts(result.data.posts || []);
          setUsers([]);
        }
      } else if (result.error) {
        const message = getUserFriendlyMessage(result.error);
        showError(message);
      }
    } catch (error) {
      console.error('Error loading search results:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const query = searchParams.get('q') || '';
    setSearchQuery(query);
  }, [searchParams]);

  useEffect(() => {
    if (searchQuery.trim()) {
      loadSearchResults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, activeType]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      loadSearchResults();
    }
  };

  const handleUpdate = () => {
    loadSearchResults();
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
      
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-[#2F3336] bg-black px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-4">
          <button
            onClick={() => router.back()}
            className="rounded-full p-2 text-white transition-colors hover:bg-[#181818]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#71767A]" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="w-full rounded-full border border-[#2F3336] bg-[#202327] py-2 pl-10 pr-4 text-white placeholder:text-[#71767A] focus:border-[#1DA1F2] focus:bg-black focus:outline-none focus:ring-2 focus:ring-[#1DA1F2]"
              />
            </div>
          </form>
        </div>
      </div>

      {/* Search Type Tabs */}
      {searchQuery.trim() && (
        <div className="sticky top-[57px] z-10 border-b border-[#2F3336] bg-black">
          <div className="mx-auto flex max-w-2xl overflow-x-auto">
            {searchTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setActiveType(type.id)}
                className={`flex-shrink-0 border-b-2 px-4 py-3 font-semibold transition-colors ${
                  activeType === type.id
                    ? 'border-[#1DA1F2] text-white'
                    : 'border-transparent text-[#71767A] hover:text-white'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      <div className="mx-auto max-w-2xl">
        {!searchQuery.trim() ? (
          <div className="p-8 text-center text-[#71767A]">
            <p className="text-xl font-semibold">Try searching for people, topics, or keywords</p>
          </div>
        ) : isLoading ? (
          <PostSkeletonList count={5} />
        ) : activeType === 'people' ? (
          <div className="divide-y divide-[#2F3336]">
            {users.length === 0 ? (
              <div className="p-8 text-center text-[#71767A]">No users found</div>
            ) : (
              users.map((userItem) => (
                <div key={userItem.id} className="flex items-center gap-3 p-4 hover:bg-[#181818] transition-colors">
                  <Link href={userItem.userId ? `/profile/${userItem.userId}` : '#'}>
                    {userItem.image ? (
                      <Image
                        src={userItem.image}
                        alt={userItem.name || 'User'}
                        width={48}
                        height={48}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2F3336] text-white">
                        {userItem.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </Link>
                  <div className="flex-1">
                    <Link
                      href={userItem.userId ? `/profile/${userItem.userId}` : '#'}
                      className="block font-semibold text-white hover:underline"
                    >
                      {userItem.name || 'User'}
                    </Link>
                    {userItem.userId && (
                      <Link
                        href={`/profile/${userItem.userId}`}
                        className="block text-sm text-[#71767A] hover:underline"
                      >
                        @{userItem.userId}
                      </Link>
                    )}
                  </div>
                  <button
                    onClick={() => router.push(`/profile/${userItem.userId || ''}`)}
                    className="rounded-full bg-[#1DA1F2] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1a8cd8]"
                  >
                    View Profile
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          <div>
            {posts.length === 0 ? (
              <div className="p-8 text-center text-[#71767A]">No posts found</div>
            ) : (
              posts.map((post) => (
                <PostItem key={post.id} post={post} onUpdate={handleUpdate} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

