'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Edit2, UserPlus, UserCheck, Repeat2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { EditProfileModal } from './edit-profile-modal';
import { PostItem } from './post-item';
import { CommentItem } from './comment-item';
import { PostSkeletonList } from './post-skeleton';
import { CommentSkeletonList } from './comment-skeleton';
import { safeApiRequest } from '@/lib/utils/error-handler';

interface ProfilePageClientProps {
  user: {
    id: string;
    name: string | null;
    userId: string | null;
    image: string | null;
    createdAt: Date;
    profile: {
      displayName: string | null;
      bio: string | null;
      avatarUrl: string | null;
      bannerUrl: string | null;
    } | null;
    _count: {
      posts: number;
      following: number;
      followers: number;
    };
    isFollowing: boolean;
    isOwnProfile: boolean;
  };
}

export function ProfilePageClient({ user: initialUser }: ProfilePageClientProps) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'likes'>('posts');
  const [isFollowing, setIsFollowing] = useState(user.isFollowing);
  const [isLoading, setIsLoading] = useState(false);

  const handleFollow = async () => {
    if (isLoading) return;
    
    // 樂觀更新：立即更新 UI
    const previousFollowing = isFollowing;
    const previousFollowers = user._count.followers;
    const newFollowing = !previousFollowing;
    const newFollowers = newFollowing ? previousFollowers + 1 : previousFollowers - 1;
    
    setIsFollowing(newFollowing);
    setUser({
      ...user,
      _count: {
        ...user._count,
        followers: newFollowers,
      },
    });
    setIsLoading(true);
    
    try {
      if (previousFollowing) {
        const res = await fetch(`/api/follows?userId=${user.id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          // API 成功，確保狀態正確
          setIsFollowing(false);
          setUser({
            ...user,
            _count: {
              ...user._count,
              followers: user._count.followers - 1,
            },
          });
        } else {
          // API 失敗，回滾狀態
          setIsFollowing(previousFollowing);
          setUser({
            ...user,
            _count: {
              ...user._count,
              followers: previousFollowers,
            },
          });
        }
      } else {
        const res = await fetch('/api/follows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        });
        if (res.ok) {
          // API 成功，確保狀態正確
          setIsFollowing(true);
          setUser({
            ...user,
            _count: {
              ...user._count,
              followers: user._count.followers + 1,
            },
          });
        } else {
          // API 失敗，回滾狀態
          setIsFollowing(previousFollowing);
          setUser({
            ...user,
            _count: {
              ...user._count,
              followers: previousFollowers,
            },
          });
        }
      }
    } catch (error) {
      // 請求失敗，回滾狀態
      setIsFollowing(previousFollowing);
      setUser({
        ...user,
        _count: {
          ...user._count,
          followers: previousFollowers,
        },
      });
      console.error('Error following/unfollowing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileUpdate = (updatedProfile: any) => {
    setUser({
      ...user,
      profile: {
        ...user.profile,
        ...updatedProfile,
      },
    });
  };

  const displayName = user.profile?.displayName || user.name || 'User';
  const avatarUrl = user.profile?.avatarUrl || user.image;
  const bannerUrl = user.profile?.bannerUrl;

  return (
    <div className="min-h-screen bg-black text-white pb-16 lg:pb-0">
      {/* Header with back arrow and user info */}
      <div className="sticky top-0 z-10 flex items-center gap-4 border-b border-[#2F3336] bg-black px-4 py-3 text-white">
        <button
          onClick={() => router.push('/')}
          className="rounded-full p-2 text-white transition-colors hover:bg-[#181818]"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{displayName}</h1>
          <p className="text-sm text-[#71767A]">
            {user._count.posts} {user._count.posts === 1 ? 'post' : 'posts'}
          </p>
        </div>
      </div>

      {/* Banner with Edit Profile button at bottom-right */}
      <div className="relative h-48 w-full bg-[#2F3336]">
        {bannerUrl ? (
          <Image
            src={bannerUrl}
            alt="Banner"
            fill
            className="object-cover"
          />
        ) : null}
        {/* Edit Profile button - 背景圖右下方 */}
        {user.isOwnProfile && (
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="absolute bottom-4 right-4 z-10 rounded-full border border-[#2F3336] bg-black px-4 py-2 font-semibold text-white shadow-lg transition-colors hover:bg-[#181818]"
          >
            <Edit2 className="mr-2 inline h-4 w-4" />
            Edit Profile
          </button>
        )}
      </div>

      {/* Profile Info */}
      <div className="relative px-4 pb-4">
        {/* Avatar - 中間對齊背景圖底部 */}
            <div className="relative -mt-16 mb-4 flex justify-center">
              <div className="relative h-32 w-32 rounded-full border-4 border-black bg-[#2F3336]">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName}
                fill
                className="rounded-full object-cover"
              />
            ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-[#2F3336] text-2xl font-semibold text-white">
                {displayName[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
        </div>

        {/* Follow/Following Button (only for other users) */}
        {!user.isOwnProfile && (
          <div className="mb-4 flex justify-end">
            <button
              onClick={handleFollow}
              disabled={isLoading}
              className={`flex items-center gap-2 rounded-full px-4 py-2 font-semibold transition-colors disabled:opacity-50 ${
                isFollowing
                  ? 'border border-[#2F3336] bg-black text-white hover:bg-[#181818]'
                  : 'bg-white text-black hover:bg-[#E7E9EA]'
              }`}
            >
              {isFollowing ? (
                <>
                  <UserCheck className="h-4 w-4" />
                  Following
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Follow
                </>
              )}
            </button>
          </div>
        )}

        {/* User Info */}
        <div className="mb-4">
          <h2 className="text-2xl font-bold">{displayName}</h2>
          {user.userId && (
            <p className="text-[#71767A]">@{user.userId}</p>
          )}
          {user.profile?.bio && (
            <p className="mt-2 text-white">{user.profile.bio}</p>
          )}
        </div>

        {/* Stats */}
        <div className="mb-4 flex gap-4 text-sm">
          <span>
            <span className="font-semibold">{user._count.following}</span>{' '}
            <span className="text-[#71767A]">Following</span>
          </span>
          <span>
            <span className="font-semibold">{user._count.followers}</span>{' '}
            <span className="text-[#71767A]">Followers</span>
          </span>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#2F3336]">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 border-b-2 px-4 py-3 font-semibold transition-colors ${
              activeTab === 'posts'
                ? 'border-[#1DA1F2] text-white'
                : 'border-transparent text-[#71767A] hover:text-white'
            }`}
          >
            Posts
          </button>
          {/* Likes tab - 只對自己顯示 */}
          {user.isOwnProfile && (
            <button
              onClick={() => setActiveTab('likes')}
              className={`flex-1 border-b-2 px-4 py-3 font-semibold transition-colors ${
              activeTab === 'likes'
                ? 'border-[#1DA1F2] text-white'
                : 'border-transparent text-[#71767A] hover:text-white'
              }`}
            >
              Likes
            </button>
          )}
        </div>

        {/* Content */}
        <div className="mt-4">
          {activeTab === 'posts' ? (
            <PostsList userId={user.userId || ''} currentUserId={user.id} />
          ) : (
            <LikesList currentUserId={user.id} />
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <EditProfileModal
          user={user}
          onClose={() => setIsEditModalOpen(false)}
          onUpdate={handleProfileUpdate}
        />
      )}
    </div>
  );
}

// Posts List 組件
function PostsList({ userId, currentUserId }: { userId: string; currentUserId: string }) {
  const [content, setContent] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadContent = async () => {
    setIsLoading(true);
    try {
      const result = await safeApiRequest(`/api/users/${userId}/posts`);
      if (result.ok && result.data) {
        setContent(result.data.content || []);
      }
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContent();
  }, [userId]);

  const handleUpdate = () => {
    loadContent();
  };

  if (isLoading) {
    return <PostSkeletonList count={5} />;
  }

  if (content.length === 0) {
    return <div className="p-4 text-center text-[#71767A]">No posts yet</div>;
  }

  return (
    <div>
      {content.map((item) => {
        if (item.type === 'post') {
          return (
            <PostItem
              key={item.id}
              post={item.item}
              onUpdate={handleUpdate}
              isRepost={item.isRepost}
              repostedBy={item.repostedBy}
            />
          );
        } else if (item.type === 'comment') {
          return (
            <div key={item.id} className="border-b border-[#2F3336]">
              {item.isRepost && item.repostedBy && (
                <div className="p-4 pb-2 flex items-center gap-2 text-sm text-[#71767A]">
                  <Repeat2 className="h-4 w-4" />
                  <Link href={`/profile/${item.repostedBy.userId}`} className="hover:underline">
                    {item.repostedBy.userId}
                  </Link>
                  <span>轉發了留言</span>
                </div>
              )}
              <CommentItem
                comment={item.item}
                postId={item.item.postId}
                currentUserId={currentUserId}
                onUpdate={handleUpdate}
              />
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

// Likes List 組件
function LikesList({ currentUserId }: { currentUserId: string }) {
  const [likes, setLikes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadLikes = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/users/me/likes');
      const data = await res.json();
      if (data.ok) {
        setLikes(data.likes || []);
      }
    } catch (error) {
      console.error('Error loading likes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLikes();
  }, []);

  const handleUpdate = () => {
    loadLikes();
  };

  if (isLoading) {
    return <PostSkeletonList count={5} />;
  }

  if (likes.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-[#2F3336] bg-[#202327] p-4 text-center">
          <p className="text-sm font-semibold text-white">
            Your likes are private. Only you can see them.
          </p>
        </div>
        <div className="text-center text-[#71767A]">
          <p>No likes yet</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {likes.map((like) => {
        if (like.type === 'post') {
          return <PostItem key={like.id} post={like.item} onUpdate={handleUpdate} />;
        } else {
          return (
            <div key={like.id} className="border-b border-[#2F3336]">
              <div className="p-4 text-sm text-[#71767A]">
                <p>Liked a comment on:</p>
              </div>
              <CommentItem
                comment={like.item}
                postId={like.item.postId}
                currentUserId={currentUserId}
                onUpdate={handleUpdate}
              />
            </div>
          );
        }
      })}
    </div>
  );
}

