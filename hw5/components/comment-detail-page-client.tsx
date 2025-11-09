'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { CommentItem } from './comment-item';
import { PostItem } from './post-item';
import { getPusherClient } from '@/lib/pusher-client';
import { getPostChannelName } from '@/lib/pusher-channels';

interface CommentDetailPageClientProps {
  comment: {
    id: string;
    content: string;
    createdAt: Date;
    postId: string;
    author: {
      id: string;
      name: string | null;
      userId: string | null;
      image: string | null;
    };
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
      media?: {
        id: string;
        url: string;
        type: 'IMAGE' | 'VIDEO';
        width?: number | null;
        height?: number | null;
        duration?: number | null;
      }[];
    };
    _count?: {
      replies: number;
      likes?: number;
      reposts?: number;
    };
    isLiked?: boolean;
    isReposted?: boolean;
  };
  replies: any[];
  currentUserId: string;
}

export function CommentDetailPageClient({
  comment,
  replies,
  currentUserId,
}: CommentDetailPageClientProps) {
  const router = useRouter();
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isPostingReply, setIsPostingReply] = useState(false);
  const [repliesList, setRepliesList] = useState(replies);

  const handlePostReply = async () => {
    if (!replyContent.trim() || isPostingReply) return;

    setIsPostingReply(true);
    try {
      const res = await fetch(`/api/posts/${comment.postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent, parentId: comment.id }),
      });

      if (res.ok) {
        const data = await res.json();
        setRepliesList([data.comment, ...repliesList]);
        setReplyContent('');
        setShowReplyInput(false);
      }
    } catch (error) {
      console.error('Error posting reply:', error);
    } finally {
      setIsPostingReply(false);
    }
  };

  const handleUpdate = () => {
    // 重新載入回覆
    fetch(`/api/posts/${comment.postId}/comments?parentId=${comment.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setRepliesList(data.comments || []);
        }
      })
      .catch((error) => {
        console.error('Error loading replies:', error);
      });
  };

  useEffect(() => {
    const client = getPusherClient();
    if (!client) {
      return;
    }

    const channelName = getPostChannelName(comment.postId);
    const channel = (client as any).subscribe(channelName);

    const handleCommentCreated = (data: { postId: string; comment?: any }) => {
      if (!data || data.postId !== comment.postId) return;
      if (data.comment?.parentId === comment.id) {
        setRepliesList((prev) => [data.comment, ...prev]);
      }
    };

    channel.bind('comment:created', handleCommentCreated);

    return () => {
      channel.unbind('comment:created', handleCommentCreated);
      if (typeof (client as any).unsubscribe === 'function') {
        (client as any).unsubscribe(channelName);
      } else if (typeof (channel as any).unsubscribe === 'function') {
        (channel as any).unsubscribe();
      }
    };
  }, [comment.id, comment.postId]);

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
          <h2 className="text-xl font-bold">Comment</h2>
        </div>
        <button
          onClick={() => router.back()}
          className="rounded-full bg-[#1DA1F2] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1a8cd8]"
        >
          Post
        </button>
      </div>

      {/* Original Post */}
      <div className="border-b border-[#2F3336]">
        <PostItem
          post={{
            ...comment.post,
            _count: {
              likes: 0,
              comments: 0,
              reposts: 0,
            },
          }}
          showComments={false}
        />
      </div>

      {/* Comment (as main post) */}
      <div className="border-b border-[#2F3336]">
        <CommentItem
          comment={comment}
          postId={comment.postId}
          currentUserId={currentUserId}
          onUpdate={handleUpdate}
          level={0}
        />
      </div>

      {/* Reply Input */}
      <div className="border-b border-[#2F3336] p-4">
        <button
          onClick={() => setShowReplyInput(!showReplyInput)}
          className="w-full rounded-lg border border-[#2F3336] bg-[#202327] px-4 py-2 text-left text-[#71767A] hover:bg-[#181818] transition-colors"
        >
          Write a reply...
        </button>
        {showReplyInput && (
          <div className="mt-4">
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
      </div>

      {/* Replies */}
      <div className="border-t border-[#2F3336]">
        {repliesList.length === 0 ? (
          <div className="p-8 text-center text-[#71767A]">No replies yet</div>
        ) : (
          <div>
            {repliesList.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                postId={comment.postId}
                currentUserId={currentUserId}
                onUpdate={handleUpdate}
                level={1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

