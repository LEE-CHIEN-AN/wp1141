"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { userIdSchema } from '@/lib/validators/user';

export default function RegisterUserIdPage() {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    const parsed = userIdSchema.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid userId');
      setIsLoading(false);
      return;
    }
    
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: parsed.data,
        }),
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.message ?? 'Failed to register');
        setIsLoading(false);
        return;
      }

      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        setError('Failed to parse server response');
        setIsLoading(false);
        return;
      }

      // 更新 session（即使失敗也繼續，因為資料庫已經更新了）
      try {
        await updateSession({ userId: data.userId });
      } catch (updateError) {
        console.error('Error updating session:', updateError);
        // 即使 session 更新失敗，也繼續導向首頁（因為資料庫已經更新了）
      }
      
      // 強制刷新頁面以更新 session（使用 window.location 確保完全刷新）
      window.location.href = '/';
    } catch (err) {
      console.error('Network error:', err);
      setError('Network error. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-6 rounded-2xl border border-[#2F3336] bg-black p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Set your UserID</h1>
          <p className="mt-2 text-[#71767A]">Choose a unique username for your account</p>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="userId" className="block text-sm font-medium text-white mb-2">
              UserID
            </label>
            <input
              id="userId"
              className="w-full rounded-lg border border-[#2F3336] bg-[#202327] px-4 py-3 text-white placeholder:text-[#71767A] focus:border-[#1DA1F2] focus:outline-none focus:ring-2 focus:ring-[#1DA1F2]"
              placeholder="e.g. ric2k1"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-full bg-[#1DA1F2] px-4 py-3 font-semibold text-white transition-colors hover:bg-[#1a8cd8] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}


