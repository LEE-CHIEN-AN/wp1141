'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Globe, Image as ImageIcon, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { countPostCharacters } from '@/lib/utils/post-counter';
import type { PostMediaInput } from '@/lib/validators/post';
import { useMediaAttachments } from '@/lib/hooks/use-media-attachments';

interface PostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPost: (input: { content: string; media: PostMediaInput[] }) => Promise<void>;
  onSaveDraft: (content: string) => Promise<void>;
  initialContent?: string;
  user: {
    name: string | null;
    userId: string | null;
    image: string | null;
  };
}

export function PostModal({
  isOpen,
  onClose,
  onPost,
  onSaveDraft,
  initialContent = '',
  user,
}: PostModalProps) {
  const [content, setContent] = useState(initialContent);
  const [isPosting, setIsPosting] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { attachments, isUploading, addFiles, removeAttachment, clearAttachments } =
    useMediaAttachments({ maxAttachments: 4, folder: 'x-clone/posts' });

  const countResult = countPostCharacters(content);
  const hasContent = content.trim().length > 0;
  const canPost = (hasContent || attachments.length > 0) && countResult.isValid && !isPosting && !isUploading;

  useEffect(() => {
    if (isOpen) {
      setContent(initialContent);
      setShowDiscardConfirm(false);
      clearAttachments();
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 120);
    }
  }, [isOpen, initialContent, clearAttachments]);

  const handleClose = () => {
    if (content.trim().length > 0 || attachments.length > 0) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleDiscard = () => {
    setContent('');
    clearAttachments();
    setShowDiscardConfirm(false);
    onClose();
  };

  const handleSaveDraft = async () => {
    if (attachments.length > 0) {
      alert('草稿目前不支援媒體，請先移除媒體後再試一次。');
      return;
    }

    if (content.trim().length === 0) {
      onClose();
      return;
    }

    await onSaveDraft(content);
    setContent('');
    setShowDiscardConfirm(false);
    onClose();
  };

  const handlePost = async () => {
    if (!canPost) return;

    setIsPosting(true);
    try {
      await onPost({ content, media: attachments });
      setContent('');
      clearAttachments();
      onClose();
    } catch (error) {
      console.error('Error posting:', error);
    } finally {
      setIsPosting(false);
    }
  };

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = event.target.value;
    const newCount = countPostCharacters(newContent);
    if (newCount.isValid || newCount.count <= 280) {
      setContent(newContent);
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

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
        <div className="relative w-full max-w-2xl rounded-2xl bg-black text-white shadow-xl border border-[#2F3336]">
          <div className="flex items-center justify-between border-b border-[#2F3336] px-6 py-4">
            <button
              onClick={handleClose}
              className="rounded-full p-2 text-white transition-colors hover:bg-[#181818]"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold">New Post</h2>
            <button
              onClick={() => setShowDrafts(true)}
              className="text-sm font-semibold text-[#1DA1F2] hover:text-[#1a8cd8]"
            >
              Drafts
            </button>
          </div>

          <div className="p-6">
            <div className="mb-4 flex items-start gap-3">
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
                <div className="mb-2 flex items-center gap-2">
                  <span className="font-semibold">{user.name || 'User'}</span>
                  {user.userId && <span className="text-sm text-[#71767A]">@{user.userId}</span>}
                  <button className="flex items-center gap-1 rounded-full border border-[#2F3336] px-3 py-1 text-sm text-[#1DA1F2] hover:bg-[#181818]">
                    <Globe className="h-4 w-4" />
                    Everyone
                  </button>
                </div>
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={handleInput}
                  placeholder="What's happening?"
                  className="w-full resize-none border-none bg-transparent text-xl text-white placeholder:text-[#71767A] focus:outline-none"
                  rows={6}
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
              </div>
            </div>

            <div className="mb-4 flex items-center gap-2 text-sm text-[#1DA1F2]">
              <Globe className="h-4 w-4" />
              <span>Everyone can reply</span>
            </div>

            <div className="flex items-center justify-between border-t border-[#2F3336] pt-4">
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

      {showDiscardConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-black border border-[#2F3336] p-6 shadow-xl">
            <h3 className="mb-4 text-xl font-bold text-white">Discard post?</h3>
            <p className="mb-6 text-[#71767A]">This can't be undone and you'll lose your draft.</p>
            <div className="flex gap-4">
              <button
                onClick={handleSaveDraft}
                className="flex-1 rounded-full border border-[#2F3336] px-4 py-2 font-semibold text-white transition-colors hover:bg-[#181818]"
              >
                Save
              </button>
              <button
                onClick={handleDiscard}
                className="flex-1 rounded-full bg-red-500 px-4 py-2 font-semibold text-white transition-colors hover:bg-red-600"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {showDrafts && (
        <DraftsModal
          isOpen={showDrafts}
          onClose={() => setShowDrafts(false)}
          onSelectDraft={(draftContent) => {
            setContent(draftContent);
            clearAttachments();
            setShowDrafts(false);
          }}
        />
      )}
    </>
  );
}

function DraftsModal({
  isOpen,
  onClose,
  onSelectDraft,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectDraft: (content: string) => void;
}) {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/drafts')
        .then((res) => res.json())
        .then((data) => {
          setDrafts(data.drafts || []);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error('Error loading drafts:', error);
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  const handleDeleteDraft = async (draftId: string) => {
    try {
      const res = await fetch(`/api/drafts?id=${draftId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setDrafts((prev) => prev.filter((draft) => draft.id !== draftId));
      }
    } catch (error) {
      console.error('Error deleting draft:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-black border border-[#2F3336] p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Drafts</h3>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-white transition-colors hover:bg-[#181818]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {isLoading ? (
          <div className="py-8 text-center text-[#71767A]">Loading...</div>
        ) : drafts.length === 0 ? (
          <div className="py-8 text-center text-[#71767A]">No drafts yet</div>
        ) : (
          <div className="max-h-96 space-y-4 overflow-y-auto">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="rounded-lg border border-[#2F3336] p-4 hover:bg-[#181818]"
              >
                <p className="mb-2 text-sm text-[#71767A]">
                  {new Date(draft.updatedAt).toLocaleDateString()}
                </p>
                <p className="mb-4 line-clamp-3 text-white">{draft.content}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onSelectDraft(draft.content);
                      onClose();
                    }}
                    className="rounded-full bg-[#1DA1F2] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1a8cd8]"
                  >
                    Continue
                  </button>
                  <button
                    onClick={() => handleDeleteDraft(draft.id)}
                    className="rounded-full border border-[#2F3336] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#181818]"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
