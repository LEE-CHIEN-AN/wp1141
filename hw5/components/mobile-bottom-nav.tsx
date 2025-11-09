'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Bell, User, PenTool, Bookmark } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { safeApiRequest } from '@/lib/utils/error-handler';

interface MobileBottomNavProps {
  user: {
    id: string;
    name: string | null;
    userId: string | null;
    image: string | null;
  };
}

export function MobileBottomNav({ user }: MobileBottomNavProps) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/explore', label: 'Explore', icon: Search },
    { href: '/notifications', label: 'Notifications', icon: Bell, showBadge: true },
    { href: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
    { href: '/profile', label: 'Profile', icon: User },
  ];

  // 載入未讀通知數量
  const loadUnreadCount = useCallback(async () => {
    try {
      const result = await safeApiRequest('/api/notifications/count');
      if (result.ok && result.data) {
        setUnreadCount(result.data.count || 0);
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  }, []);

  // 初始化：載入計數、設置定時器和事件監聽器
  useEffect(() => {
    loadUnreadCount();
    
    // 每 30 秒更新一次
    const interval = setInterval(loadUnreadCount, 30000);
    
    // 監聽通知已讀事件，立即更新計數
    const handleNotificationRead = () => {
      loadUnreadCount();
    };
    window.addEventListener('notification-read', handleNotificationRead);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('notification-read', handleNotificationRead);
    };
  }, [loadUnreadCount]);

  // 當路徑變更為通知頁面時，立即更新計數
  useEffect(() => {
    if (pathname === '/notifications') {
      loadUnreadCount();
    }
  }, [pathname, loadUnreadCount]);

  return (
    <nav className="flex items-center justify-around px-1 py-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        const showBadge = item.showBadge && unreadCount > 0;
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative flex flex-col items-center justify-center rounded-full p-2 text-white transition-colors active:bg-[#181818]"
          >
            <div className="relative">
              <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${isActive ? 'text-white' : 'text-[#71767A]'}`} />
              {showBadge && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#1DA1F2] px-1 text-[10px] font-bold text-white sm:h-5 sm:min-w-[20px] sm:px-1.5 sm:text-xs">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <span className={`mt-0.5 text-[10px] sm:text-xs ${isActive ? 'text-white font-semibold' : 'text-[#71767A]'}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
      
      {/* Post Button */}
      <Link
        href="/post"
        className="flex items-center justify-center rounded-full bg-[#1DA1F2] p-2.5 text-white transition-colors active:bg-[#1a8cd8] sm:p-3"
      >
        <PenTool className="h-5 w-5 sm:h-6 sm:w-6" />
      </Link>
    </nav>
  );
}

