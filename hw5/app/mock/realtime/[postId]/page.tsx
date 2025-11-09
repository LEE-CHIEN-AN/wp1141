'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { getPusherClient } from '@/lib/pusher-client';
import { getPostChannelName } from '@/lib/pusher-channels';

export default function MockRealtimePage() {
  const searchParams = useSearchParams();
  const routeParams = useParams<{ postId: string }>();
  const postId = routeParams?.postId ?? 'unknown';
  const initialLikes = Number(searchParams.get('likes') ?? '0');
  const initialComments = Number(searchParams.get('comments') ?? '0');
  const [likes, setLikes] = useState(initialLikes);
  const [comments, setComments] = useState(initialComments);

  useEffect(() => {
    (window as any).__mockLikes = likes;
  }, [likes]);

  useEffect(() => {
    (window as any).__mockComments = comments;
  }, [comments]);

  useEffect(() => {
    const client = getPusherClient();
    if (!client) {
      return;
    }

    const channelName = getPostChannelName(postId);
    const channel = (client as any).subscribe(channelName);

    const handleLikeUpdated = (data: { postId: string; likes: number }) => {
      if (data?.postId !== postId) return;
      setLikes(data.likes ?? 0);
    };

    const handleCommentCreated = (data: { postId: string; count: number }) => {
      if (data?.postId !== postId) return;
      setComments(data.count ?? 0);
    };

    channel.bind('like:updated', handleLikeUpdated);
    channel.bind('comment:created', handleCommentCreated);

    if (typeof window !== 'undefined') {
      const map = (window as any).__mockChannels ?? {};
      map[channelName] = true;
      (window as any).__mockChannels = map;
    }

    return () => {
      channel.unbind('like:updated', handleLikeUpdated);
      channel.unbind('comment:created', handleCommentCreated);
      if (typeof (client as any).unsubscribe === 'function') {
        (client as any).unsubscribe(channelName);
      } else if (typeof (channel as any).unsubscribe === 'function') {
        (channel as any).unsubscribe();
      }
    };
  }, [postId]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white p-8">
      <h1 className="text-2xl font-bold">Mock Realtime Post: {postId}</h1>
      <div className="flex gap-8 text-xl">
        <div data-testid="likes-count" className="flex flex-col items-center">
          <span className="font-semibold">Likes</span>
          <span>{likes}</span>
        </div>
        <div data-testid="comments-count" className="flex flex-col items-center">
          <span className="font-semibold">Comments</span>
          <span>{comments}</span>
        </div>
      </div>
    </div>
  );
}
