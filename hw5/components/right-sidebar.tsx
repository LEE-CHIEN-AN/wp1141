'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search as SearchIcon, Hash, UserPlus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TrendingSkeleton } from './trending-skeleton';
import { UserSkeletonList } from './user-skeleton';

interface RightSidebarProps {
  currentUserId: string;
}

interface TrendingItem {
  tag: string;
  count: number;
}

export function RightSidebar({ currentUserId: _currentUserId }: RightSidebarProps) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState('');
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [recommendedUsers, setRecommendedUsers] = useState<any[]>([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState(true);
  const [isLoadingRecommended, setIsLoadingRecommended] = useState(true);
  const [followLoading, setFollowLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/hashtags/trending')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setTrending(data.trending || []);
        }
        setIsLoadingTrending(false);
      })
      .catch((error) => {
        console.error('Error loading trending hashtags:', error);
        setIsLoadingTrending(false);
      });
  }, []);

  useEffect(() => {
    fetch('/api/users/recommended')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setRecommendedUsers(data.users || []);
        }
        setIsLoadingRecommended(false);
      })
      .catch((error) => {
        console.error('Error loading recommended users:', error);
        setIsLoadingRecommended(false);
      });
  }, []);

  const handleFollow = async (userId: string) => {
    if (followLoading[userId]) return;
    setFollowLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      const res = await fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        setRecommendedUsers((prev) => prev.filter((u) => u.id !== userId));
      }
    } catch (error) {
      console.error('Error following user:', error);
    } finally {
      setFollowLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const query = searchValue.trim();
    if (!query) return;
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  const formatCount = useMemo(() => {
    return new Intl.NumberFormat('en', {
      notation: 'compact',
      maximumFractionDigits: 1,
    });
  }, []);

  return (
    <aside className="sticky top-0 hidden h-screen w-80 overflow-y-auto border-l border-[#2F3336] bg-black p-4 text-white xl:block">
      <form onSubmit={handleSearchSubmit} className="mb-6">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#71767A]" />
          <input
            type="search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search"
            className="w-full rounded-full border border-[#2F3336] bg-[#202327] py-2 pl-10 pr-4 text-sm text-white placeholder:text-[#71767A] focus:border-[#1DA1F2] focus:bg-black focus:outline-none focus:ring-2 focus:ring-[#1DA1F2]"
          />
        </div>
      </form>

      <div className="mb-6 rounded-xl border border-[#2F3336] bg-[#202327] p-4">
        <h3 className="mb-4 text-xl font-bold">What's happening</h3>
        {isLoadingTrending ? (
          <TrendingSkeleton />
        ) : trending.length === 0 ? (
          <div className="py-4 text-center text-sm text-[#71767A]">No trending hashtags</div>
        ) : (
          <div className="space-y-3">
            {trending.map((item) => (
              <button
                key={item.tag}
                type="button"
                onClick={() => router.push(`/hashtag/${encodeURIComponent(item.tag)}`)}
                className="flex w-full items-start justify-between rounded-lg p-2 text-left transition-colors hover:bg-[#181818]"
              >
                <div>
                  <div className="flex items-center gap-2 font-semibold text-white">
                    <Hash className="h-4 w-4 text-[#71767A]" />
                    <span>#{item.tag}</span>
                  </div>
                  <div className="text-xs text-[#71767A]">{formatCount.format(item.count)} posts</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#2F3336] bg-[#202327] p-4">
        <h3 className="mb-4 text-xl font-bold">Who to follow</h3>
        {isLoadingRecommended ? (
          <UserSkeletonList count={3} />
        ) : recommendedUsers.length === 0 ? (
          <div className="py-4 text-center text-sm text-[#71767A]">No recommendations</div>
        ) : (
          <div className="space-y-4">
            {recommendedUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-3">
                <Link href={user.userId ? `/profile/${user.userId}` : '#'}>
                  {user.image ? (
                    <Image
                      src={user.image}
                      alt={user.name || 'User'}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2F3336] text-white">
                      {user.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </Link>
                <div className="flex-1">
                  <Link
                    href={user.userId ? `/profile/${user.userId}` : '#'}
                    className="block font-semibold text-white hover:underline"
                  >
                    {user.name || 'User'}
                  </Link>
                  {user.userId && (
                    <Link
                      href={`/profile/${user.userId}`}
                      className="block text-sm text-[#71767A] hover:underline"
                    >
                      @{user.userId}
                    </Link>
                  )}
                </div>
                <button
                  onClick={() => handleFollow(user.id)}
                  disabled={followLoading[user.id]}
                  className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-black transition-colors hover:bg-[#E7E9EA] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <UserPlus className="h-4 w-4" />
                  Follow
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
