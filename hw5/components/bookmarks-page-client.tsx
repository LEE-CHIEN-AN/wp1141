'use client';

import { useEffect, useState } from 'react';
import { PostItem } from './post-item';
import { PostSkeletonList } from './post-skeleton';
import { useErrorToast } from './error-toast';
import { safeApiRequest, getUserFriendlyMessage } from '@/lib/utils/error-handler';

interface BookmarksPageClientProps {
  user: {
    id: string;
    name: string | null;
    userId: string | null;
    image: string | null;
  } | null;
}

export function BookmarksPageClient({ user }: BookmarksPageClientProps) {
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showError, ToastContainer } = useErrorToast();

  const loadBookmarks = async () => {
    setIsLoading(true);
    setError(null);
    
    const result = await safeApiRequest('/api/bookmarks');
    
    if (result.ok && result.data) {
      setPosts(result.data.posts || []);
    } else if (result.error) {
      const message = getUserFriendlyMessage(result.error);
      setError(message);
      showError(message);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    loadBookmarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdate = () => {
    loadBookmarks();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white pb-16 lg:pb-0">
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
      <div className="sticky top-0 z-10 border-b border-[#2F3336] bg-black px-3 py-2 sm:px-4 sm:py-3">
        <div className="mx-auto flex max-w-2xl items-center">
          <h2 className="text-lg font-bold sm:text-xl">Bookmarks</h2>
        </div>
      </div>

      {/* Bookmarks List */}
      <div className="mx-auto max-w-2xl">
        {isLoading ? (
          <PostSkeletonList count={5} />
        ) : error ? (
          <div className="p-4 text-center">
            <p className="mb-4 text-red-400">{error}</p>
            <button
              onClick={loadBookmarks}
              className="rounded-full bg-[#1DA1F2] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1a8cd8]"
            >
              重試
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center text-[#71767A]">
            <p className="mb-2 text-lg font-semibold text-white">You haven't added any Bookmarks yet</p>
            <p className="text-sm">When you do, they'll show up here.</p>
          </div>
        ) : (
          <div>
            {posts.map((post) => (
              <PostItem key={post.id} post={post} onUpdate={handleUpdate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}




