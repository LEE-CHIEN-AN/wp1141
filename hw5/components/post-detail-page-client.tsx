'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PostItem } from './post-item';
import { CommentItem } from './comment-item';

interface PostDetailPageClientProps {
  post: {
    id: string;
    content: string;
    createdAt: Date;
    author: {
      id: string;
      name: string | null;
      userId: string | null;
      image: string | null;
    };
    _count?: {
      likes: number;
      comments: number;
      reposts: number;
    };
    isLiked?: boolean;
    isReposted?: boolean;
    canDelete?: boolean;
    media?: {
      id: string;
      url: string;
      type: 'IMAGE' | 'VIDEO';
      width?: number | null;
      height?: number | null;
      duration?: number | null;
    }[];
  };
  initialComments: any[];
  currentUserId: string;
}

export function PostDetailPageClient({
  post,
  initialComments,
  currentUserId,
}: PostDetailPageClientProps) {
  const router = useRouter();
  const [comments, setComments] = useState(initialComments);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdate = () => {
    // 重新載入留言
    fetch(`/api/posts/${post.id}/comments`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setComments(data.comments || []);
        }
      })
      .catch((error) => {
        console.error('Error loading comments:', error);
      });
  };

  return (
    <div className="min-h-screen bg-black text-white pb-16 lg:pb-0">
      {/* Header with back button and Post button */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2F3336] bg-black px-4 py-3 text-white">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="rounded-full p-2 text-white hover:bg-[#181818] transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-bold">Post</h2>
        </div>
        <button
          onClick={() => router.back()}
          className="rounded-full bg-[#1DA1F2] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1a8cd8]"
        >
          Post
        </button>
      </div>

      {/* Post */}
      <PostItem post={post} onUpdate={handleUpdate} showComments={true} />

      {/* Comments */}
      <div className="border-t border-[#2F3336]">
        {comments.length === 0 ? (
          <div className="p-8 text-center text-[#71767A]">No comments yet</div>
        ) : (
          <div>
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                postId={post.id}
                currentUserId={currentUserId}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

