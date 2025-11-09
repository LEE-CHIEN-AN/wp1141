'use client';

import { useState, useRef } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface EditProfileModalProps {
  user: {
    id: string;
    name: string | null;
    image?: string | null;
    profile: {
      displayName: string | null;
      bio: string | null;
      avatarUrl: string | null;
      bannerUrl: string | null;
    } | null;
  };
  onClose: () => void;
  onUpdate: (updatedProfile: any) => void;
}

export function EditProfileModal({ user, onClose, onUpdate }: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(user.profile?.displayName || user.name || '');
  const [bio, setBio] = useState(user.profile?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user.profile?.avatarUrl || user.image || '');
  const [bannerUrl, setBannerUrl] = useState(user.profile?.bannerUrl || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File, type: 'avatar' | 'banner') => {
    setIsUploading(true);
    try {
      // 取得 Cloudinary 簽名
      const signRes = await fetch('/api/cloudinary/sign?folder=x-clone');
      const signData = await signRes.json();

      // 建立 FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', signData.apiKey);
      formData.append('timestamp', signData.timestamp.toString());
      formData.append('signature', signData.signature);
      formData.append('folder', signData.folder);

      // 上傳到 Cloudinary
      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!uploadRes.ok) {
        throw new Error('Upload failed');
      }

      const uploadData = await uploadRes.json();
      const imageUrl = uploadData.secure_url;

      if (type === 'avatar') {
        setAvatarUrl(imageUrl);
      } else {
        setBannerUrl(imageUrl);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/users/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName || null,
          bio: bio || null,
          avatarUrl: avatarUrl || null,
          bannerUrl: bannerUrl || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onUpdate(data.profile);
        onClose();
      } else {
        const error = await res.json().catch(() => ({}));
        alert(error.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black p-0 lg:bg-black/80 lg:p-4 overflow-y-auto">
      <div className="relative w-full h-full lg:h-auto lg:max-h-[90vh] lg:max-w-2xl lg:rounded-2xl bg-black border-0 lg:border border-[#2F3336] shadow-xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2F3336] bg-black px-4 lg:px-6 py-4">
          <h2 className="text-xl font-bold text-white">Edit Profile</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-white transition-colors hover:bg-[#181818]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 lg:p-6 pb-24 lg:pb-6">
          {/* Banner Upload */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-semibold text-white">Banner</label>
            <div className="relative h-32 w-full overflow-hidden rounded-lg bg-[#2F3336]">
              {bannerUrl ? (
                <Image
                  src={bannerUrl}
                  alt="Banner"
                  fill
                  className="object-cover"
                />
              ) : null}
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleImageUpload(file, 'banner');
                  }
                }}
              />
              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                disabled={isUploading}
                className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity hover:opacity-100 disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Upload className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>

          {/* Avatar Upload */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-semibold text-white">Avatar</label>
            <div className="relative inline-block">
              <div className="relative h-24 w-24 overflow-hidden rounded-full bg-[#2F3336]">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="Avatar"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-white">
                    {displayName[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleImageUpload(file, 'avatar');
                  }
                }}
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploading}
                className="absolute bottom-0 right-0 rounded-full bg-black p-2 text-white transition-opacity hover:bg-gray-800 disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Display Name */}
          <div className="mb-4">
            <label htmlFor="displayName" className="mb-2 block text-sm font-semibold text-white">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={100}
              className="w-full rounded-lg border border-[#2F3336] bg-[#202327] px-4 py-2 text-white placeholder:text-[#71767A] focus:border-[#1DA1F2] focus:outline-none focus:ring-2 focus:ring-[#1DA1F2]"
            />
          </div>

          {/* Bio */}
          <div className="mb-6">
            <label htmlFor="bio" className="mb-2 block text-sm font-semibold text-white">
              Bio
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={280}
              rows={4}
              className="w-full rounded-lg border border-[#2F3336] bg-[#202327] px-4 py-2 text-white placeholder:text-[#71767A] focus:border-[#1DA1F2] focus:outline-none focus:ring-2 focus:ring-[#1DA1F2] resize-none"
            />
            <p className="mt-1 text-right text-sm text-[#71767A]">{bio.length}/280</p>
          </div>

          {/* Actions - 固定在底部（手機端），確保在底部導航欄上方 */}
          <div className="sticky bottom-0 left-0 right-0 bg-black border-t border-[#2F3336] -mx-4 lg:mx-0 lg:border-t-0 lg:static px-4 lg:px-0 py-4 lg:py-0 mt-auto mb-20 lg:mb-0 z-10 shadow-lg lg:shadow-none">
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-[#2F3336] px-4 py-2 font-semibold text-white transition-colors hover:bg-[#181818]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || isUploading}
                className="rounded-lg bg-[#1DA1F2] px-4 py-2 font-semibold text-white transition-colors hover:bg-[#1a8cd8] disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

