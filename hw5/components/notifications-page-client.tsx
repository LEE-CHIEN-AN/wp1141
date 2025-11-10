'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Heart, Repeat2, MessageCircle, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { useErrorToast } from './error-toast';
import { safeApiRequest, getUserFriendlyMessage } from '@/lib/utils/error-handler';
import { NotificationSkeletonList } from './notification-skeleton';

interface NotificationsPageClientProps {
  user: {
    id: string;
    name: string | null;
    userId: string | null;
    image: string | null;
  } | null;
  initialType: string;
}

type NotificationType = 'all' | 'verified' | 'mentions';

interface Notification {
  id: string;
  type: string;
  read: boolean;
  createdAt: Date;
  actor: {
    id: string;
    name: string | null;
    userId: string | null;
    image: string | null;
  };
  post?: {
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
      type: string;
    }[];
    _count?: {
      likes: number;
      comments: number;
      reposts: number;
    };
  };
  comment?: {
    id: string;
    content: string;
    createdAt: Date;
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
    };
    _count?: {
      likes: number;
      replies: number;
      reposts: number;
    };
  };
}

export function NotificationsPageClient({ user, initialType }: NotificationsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeType, setActiveType] = useState<NotificationType>(
    (initialType as NotificationType) || 'all'
  );
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showError, ToastContainer } = useErrorToast();

  const types = [
    { id: 'all' as NotificationType, label: 'All' },
    { id: 'verified' as NotificationType, label: 'Verified' },
    { id: 'mentions' as NotificationType, label: 'Mentions' },
  ];

  // 載入通知
  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const result = await safeApiRequest(`/api/notifications?type=${activeType}`);
      if (result.ok && result.data) {
        setNotifications(result.data.notifications || []);
      } else if (result.error) {
        const message = getUserFriendlyMessage(result.error);
        showError(message);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [activeType]);

  // 標記通知為已讀
  const markAsRead = async (notificationId: string) => {
    try {
      const result = await safeApiRequest('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });

      if (result.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        );
        // 觸發事件通知側邊欄和底部導航更新計數
        window.dispatchEvent(new CustomEvent('notification-read'));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // 標記所有通知為已讀
  const markAllAsRead = async () => {
    try {
      const result = await safeApiRequest('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true }),
      });

      if (result.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        // 觸發事件通知側邊欄和底部導航更新計數
        window.dispatchEvent(new CustomEvent('notification-read'));
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'POST_LIKE':
      case 'COMMENT_LIKE':
        return <Heart className="h-5 w-5 text-red-500" />;
      case 'POST_REPOST':
      case 'COMMENT_REPOST':
        return <Repeat2 className="h-5 w-5 text-[#1DA1F2]" />;
      case 'POST_COMMENT':
      case 'COMMENT_REPLY':
        return <MessageCircle className="h-5 w-5 text-[#1DA1F2]" />;
      case 'POST_MENTION':
      case 'COMMENT_MENTION':
        return <MessageCircle className="h-5 w-5 text-[#1DA1F2]" />;
      default:
        return <MessageCircle className="h-5 w-5 text-[#71767A]" />;
    }
  };

  const getNotificationText = (notification: Notification) => {
    const actorName = notification.actor.name || notification.actor.userId || 'Someone';
    switch (notification.type) {
      case 'POST_LIKE':
        return `${actorName} liked your post`;
      case 'POST_REPOST':
        return `${actorName} reposted your post`;
      case 'POST_COMMENT':
        return `${actorName} commented on your post`;
      case 'POST_MENTION':
        return `${actorName} mentioned you in a post`;
      case 'COMMENT_LIKE':
        return `${actorName} liked your comment`;
      case 'COMMENT_REPOST':
        return `${actorName} reposted your comment`;
      case 'COMMENT_REPLY':
        return `${actorName} replied to your comment`;
      case 'COMMENT_MENTION':
        return `${actorName} mentioned you in a comment`;
      default:
        return `${actorName} interacted with your content`;
    }
  };

  const getNotificationLink = (notification: Notification) => {
    if (notification.comment) {
      return `/post/${notification.comment.post.id}/comment/${notification.comment.id}`;
    } else if (notification.post) {
      return `/post/${notification.post.id}`;
    }
    return '#';
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
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <h2 className="text-xl font-bold">Notifications</h2>
          <button
            onClick={markAllAsRead}
            disabled={notifications.filter((n) => !n.read).length === 0}
            className="rounded-full px-4 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:bg-[#2F3336] disabled:text-[#71767A] enabled:bg-[#1DA1F2] enabled:hover:bg-[#1a8cd8]"
          >
            Mark all as read
          </button>
        </div>
      </div>

      {/* Type Tabs */}
      <div className="sticky top-[53px] z-10 border-b border-[#2F3336] bg-black">
        <div className="mx-auto flex max-w-2xl overflow-x-auto">
          {types.map((type) => (
            <button
              key={type.id}
              onClick={() => {
                setActiveType(type.id);
                router.push(`/notifications?type=${type.id}`);
              }}
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

      {/* Notifications List */}
      <div className="mx-auto max-w-2xl">
        {isLoading ? (
          <NotificationSkeletonList count={5} />
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-[#71767A]">
            <p className="mb-2 text-xl font-semibold text-white">Nothing to see here — yet</p>
            <p className="text-sm">From likes to reposts and a whole lot more, this is where all the action happens.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#2F3336]">
            {notifications.map((notification) => (
              <Link
                key={notification.id}
                href={getNotificationLink(notification)}
                onClick={() => {
                  if (!notification.read) {
                    markAsRead(notification.id);
                  }
                }}
                className={`flex gap-3 p-4 transition-colors hover:bg-[#181818] ${
                  !notification.read ? 'bg-[#181818]/50' : ''
                }`}
              >
                {/* Actor Avatar */}
                <div className="flex-shrink-0">
                  {notification.actor.image ? (
                    <Image
                      src={notification.actor.image}
                      alt={notification.actor.name || 'User'}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2F3336] text-white">
                      {notification.actor.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>

                {/* Notification Content */}
                <div className="flex-1">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        {getNotificationIcon(notification.type)}
                        <p className="text-sm text-white">
                          {getNotificationText(notification)}
                        </p>
                      </div>
                      <p className="text-xs text-[#71767A]">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="h-2 w-2 rounded-full bg-[#1DA1F2]" />
                    )}
                  </div>

                  {/* Post or Comment Preview */}
                  {notification.post && (
                    <div className="mt-2 rounded-lg border border-[#2F3336] p-3">
                      <p className="text-sm text-[#71767A] line-clamp-2">{notification.post.content}</p>
                      {notification.post.media && notification.post.media.length > 0 && (
                        <div className="mt-2 h-32 w-full overflow-hidden rounded-lg bg-[#2F3336]">
                          <Image
                            src={notification.post.media[0].url}
                            alt="Post media"
                            width={200}
                            height={128}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {notification.comment && (
                    <div className="mt-2 rounded-lg border border-[#2F3336] p-3">
                      <p className="text-sm text-[#71767A] line-clamp-2">{notification.comment.content}</p>
                    </div>
                  )}
                </div>

                {/* Arrow Icon */}
                <div className="flex-shrink-0 self-center">
                  <ArrowRight className="h-5 w-5 text-[#71767A]" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

