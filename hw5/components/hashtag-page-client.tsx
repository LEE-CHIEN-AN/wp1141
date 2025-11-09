'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { InlineComposer } from './inline-composer';
import { PostItem } from './post-item';
import { useErrorToast } from './error-toast';
import { PostSkeletonList } from './post-skeleton';
import { safeApiRequest, getUserFriendlyMessage } from '@/lib/utils/error-handler';
import type { PostMediaInput } from '@/lib/validators/post';

interface HashtagPageClientProps {
  tag: string;
  user: {
    id: string;
    name: string | null;
    userId: string | null;
    image: string | null;
  } | null;
}

export function HashtagPageClient({ tag, user }: HashtagPageClientProps) {
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showError, showSuccess, ToastContainer } = useErrorToast();

  const loadPosts = async () => {
    setIsLoading(true);
    setError(null);
    
    const result = await safeApiRequest(`/api/hashtags/${encodeURIComponent(tag)}`);
    
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
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tag]);

  const handlePost = async ({ content, media }: { content: string; media: PostMediaInput[] }) => {
    const result = await safeApiRequest('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, media }),
    });

    if (result.ok) {
      showSuccess('貼文已發布');
      await loadPosts();
      router.refresh();
    } else if (result.error) {
      const message = getUserFriendlyMessage(result.error);
      showError(message);
      throw new Error(message);
    }
  };

  const handleUpdate = () => {
    loadPosts();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-2xl p-4">
          <p className="text-gray-600">Please log in to continue</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-16 lg:pb-0">
      <div className="sticky top-0 z-10 border-b border-[#2F3336] bg-black px-4 py-3 text-white">
        <div className="mx-auto flex max-w-2xl flex-col gap-1">
          <h1 className="text-2xl font-bold">#{tag}</h1>
          <p className="text-sm text-[#71767A]">Latest posts tagged with #{tag}</p>
        </div>
      </div>

      <InlineComposer
        user={{
          name: user.name,
          userId: user.userId,
          image: user.image,
        }}
        onPost={handlePost}
      />

      <div className="mx-auto max-w-2xl">
        {isLoading ? (
          <PostSkeletonList count={5} />
        ) : error ? (
          <div className="p-4 text-center">
            <p className="mb-4 text-red-400">{error}</p>
            <button
              onClick={loadPosts}
              className="rounded-full bg-[#1DA1F2] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1a8cd8]"
            >
              重試
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="p-4 text-center text-[#71767A]">No posts found for #{tag}</div>
        ) : (
          <div>
            {posts.map((post) => (
              <PostItem key={post.id} post={post} onUpdate={handleUpdate} />
            ))}
          </div>
        )}
      </div>
      <ToastContainer />
    </div>
  );
}

