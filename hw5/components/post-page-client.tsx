'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PostModal } from './post-modal';
import type { PostMediaInput } from '@/lib/validators/post';

interface PostPageClientProps {
  user: {
    id: string;
    name: string | null;
    userId: string | null;
    image: string | null;
  };
}

export function PostPageClient({ user }: PostPageClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(true);
  const router = useRouter();

  const handlePost = async ({ content, media }: { content: string; media: PostMediaInput[] }) => {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, media }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to post');
    }

    // 發文成功後，導向首頁
    router.push('/');
  };

  const handleSaveDraft = async (content: string) => {
    const res = await fetch('/api/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to save draft');
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    router.push('/');
  };

  return (
    <PostModal
      isOpen={isModalOpen}
      onClose={handleClose}
      onPost={handlePost}
      onSaveDraft={handleSaveDraft}
      user={{
        name: user.name,
        userId: user.userId,
        image: user.image,
      }}
    />
  );
}


