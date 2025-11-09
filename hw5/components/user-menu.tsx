'use client';

import { useState, useRef, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import Image from 'next/image';

interface UserMenuProps {
  name?: string | null;
  userId?: string | null;
  image?: string | null;
}

export function UserMenu({ name, userId, image }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <div className="relative w-full" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-3 rounded-full p-2 text-white transition-colors hover:bg-[#181818]"
      >
        {image ? (
          <Image
            src={image}
            alt={name || 'User'}
            width={40}
            height={40}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2F3336] text-white">
            {name?.[0]?.toUpperCase() || 'U'}
          </div>
        )}
        <div className="hidden flex-1 flex-col items-start text-left md:flex">
          <span className="text-sm font-semibold">{name || 'User'}</span>
          {userId && (
            <span className="text-xs text-white/70">@{userId}</span>
          )}
        </div>
        <svg
          className="h-5 w-5 text-white"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-full rounded-2xl border border-[#2F3336] bg-[#202327] shadow-lg">
          <button
            onClick={handleLogout}
            className="w-full rounded-lg px-4 py-3 text-left text-sm text-white transition-colors hover:bg-[#181818]"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

