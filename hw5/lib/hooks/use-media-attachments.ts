"use client";

import { useCallback, useMemo, useState } from 'react';
import type { PostMediaInput } from '@/lib/validators/post';

export interface AttachmentState extends PostMediaInput {
  clientId: string;
  previewUrl: string;
}

interface UseMediaAttachmentsOptions {
  maxAttachments?: number;
  folder?: string;
}

export function useMediaAttachments(options: UseMediaAttachmentsOptions = {}) {
  const { maxAttachments = 4, folder = 'x-clone/posts' } = options;
  const [attachments, setAttachments] = useState<AttachmentState[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);

  const isUploading = useMemo(() => uploadingCount > 0, [uploadingCount]);

  const uploadSingleFile = useCallback(
    async (file: File) => {
      setUploadingCount((prev) => prev + 1);

      try {
        const signRes = await fetch(`/api/cloudinary/sign?folder=${encodeURIComponent(folder)}`);
        if (!signRes.ok) {
          throw new Error('Failed to get Cloudinary signature');
        }

        const signData = await signRes.json();

        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', signData.apiKey);
        formData.append('timestamp', String(signData.timestamp));
        formData.append('signature', signData.signature);
        formData.append('folder', signData.folder);

        const uploadUrl = `https://api.cloudinary.com/v1_1/${signData.cloudName}/auto/upload`;
        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error('Cloudinary upload failed');
        }

        const uploadData = await uploadRes.json();
        const type = uploadData.resource_type === 'video' ? 'VIDEO' : 'IMAGE';

        const attachment: AttachmentState = {
          clientId: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
          url: uploadData.secure_url,
          publicId: uploadData.public_id,
          type,
          width: uploadData.width ?? undefined,
          height: uploadData.height ?? undefined,
          duration: uploadData.duration ?? undefined,
          previewUrl: uploadData.secure_url,
        };

        setAttachments((prev) => [...prev, attachment]);
      } catch (error) {
        console.error('Error uploading media:', error);
        alert('媒體上傳失敗，請稍後再試。');
      } finally {
        setUploadingCount((prev) => Math.max(0, prev - 1));
      }
    },
    [folder]
  );

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      if (files.length === 0) return;

      const availableSlots = maxAttachments - attachments.length;
      if (availableSlots <= 0) {
        alert(`最多只能上傳 ${maxAttachments} 個媒體。`);
        return;
      }

      files.slice(0, availableSlots).forEach((file) => {
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
          alert('僅支援上傳圖片或影片檔案。');
          return;
        }
        uploadSingleFile(file);
      });
    },
    [attachments.length, maxAttachments, uploadSingleFile]
  );

  const removeAttachment = useCallback((publicId: string) => {
    setAttachments((prev) => prev.filter((item) => item.publicId !== publicId));
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
  }, []);

  return {
    attachments,
    isUploading,
    addFiles,
    removeAttachment,
    clearAttachments,
  };
}







