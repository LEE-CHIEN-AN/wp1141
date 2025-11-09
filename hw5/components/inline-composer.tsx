'use client';

import { useRef, useState } from 'react';
import { X, Image as ImageIcon, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { countPostCharacters } from '@/lib/utils/post-counter';
import type { PostMediaInput } from '@/lib/validators/post';
import { useMediaAttachments } from '@/lib/hooks/use-media-attachments';

interface InlineComposerProps {
  user: {
    name: string | null;
    userId: string | null;
    image: string | null;
  };
  onPost: (input: { content: string; media: PostMediaInput[] }) => Promise<void>;
}

export function InlineComposer({ user, onPost }: InlineComposerProps) {
  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { attachments, isUploading, addFiles, removeAttachment, clearAttachments } =
    useMediaAttachments({ maxAttachments: 4, folder: 'x-clone/posts' });

  const countResult = countPostCharacters(content);
  const hasContent = content.trim().length > 0;
  const canPost = (hasContent || attachments.length > 0) && countResult.isValid && !isPosting && !isUploading;

  const handlePost = async () => {
    if (!canPost) return;

    setIsPosting(true);
    try {
      await onPost({ content, media: attachments });
      setContent('');
      clearAttachments();
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      // 錯誤已由父組件處理並顯示 toast
      console.error('Error posting:', error);
    } finally {
      setIsPosting(false);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const newCount = countPostCharacters(newContent);
    if (newCount.isValid || newCount.count <= 280) {
      setContent(newContent);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }
  };

  const handleMediaClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    addFiles(event.target.files);
    event.target.value = '';
  };

  return (
    <div className="border-b border-[#2F3336] p-3 sm:p-4 text-white">
      <div className="flex gap-3">
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
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleInput}
            placeholder="What is happening?!"
            className="w-full resize-none border-none bg-transparent text-xl text-white placeholder:text-[#71767A] focus:outline-none"
            rows={3}
          />

          {attachments.length > 0 && (
            <div className={`mt-4 grid gap-3 ${attachments.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {attachments.map((attachment) => {
                const aspectRatio = attachment.width && attachment.height
                  ? `${attachment.width} / ${attachment.height}`
                  : '4 / 3';

                return (
                  <div
                    key={attachment.clientId}
                    className="group relative w-full overflow-hidden rounded-2xl border border-[#2F3336]"
                    style={{ aspectRatio }}
                  >
                    <button
                      type="button"
                      onClick={() => removeAttachment(attachment.publicId)}
                      className="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-1 text-white opacity-0 transition-all hover:bg-black group-hover:opacity-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    {attachment.type === 'VIDEO' ? (
                      <video
                        controls
                        className="absolute inset-0 h-full w-full object-cover"
                        src={attachment.url}
                      />
                    ) : (
                      <Image
                        src={attachment.previewUrl || attachment.url}
                        alt="Post attachment"
                        fill
                        className="object-cover"
                        sizes="(min-width: 1024px) 18rem, 80vw"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between border-t border-[#2F3336] pt-4">
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={handleMediaClick}
                className="rounded-full p-2 text-[#1DA1F2] transition-colors hover:bg-[#181818]"
              >
                <ImageIcon className="h-5 w-5" />
              </button>
              {isUploading && <span className="text-sm text-[#71767A]">正在上傳媒體...</span>}
            </div>
            <div className="flex items-center gap-4">
              <div
                className={`text-sm ${
                  countResult.count > 280
                    ? 'text-red-500'
                    : countResult.count > 260
                      ? 'text-orange-500'
                      : 'text-[#71767A]'
                }`}
              >
                {countResult.count}/280
              </div>
              <button
                onClick={handlePost}
                disabled={!canPost}
                className={`rounded-full px-6 py-2 font-semibold text-white transition-colors ${
                  canPost
                    ? 'bg-[#1DA1F2] hover:bg-[#1a8cd8]'
                    : 'bg-[#2F3336] cursor-not-allowed opacity-50'
                }`}
              >
                {isPosting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

