'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, User, PenTool, Search, Bell, Bookmark } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { safeApiRequest } from '@/lib/utils/error-handler';

interface SidebarProps {
  userMenu?: React.ReactNode;
}

export function Sidebar({ userMenu }: SidebarProps) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/explore', label: 'Explore', icon: Search },
    { href: '/notifications', label: 'Notifications', icon: Bell },
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
    <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-[#2F3336] bg-black p-4 lg:flex">
      {/* Logo/Icon - X logo */}
      <div className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center text-white">
          <span className="text-2xl font-bold">X</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const showBadge = item.href === '/notifications' && unreadCount > 0;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 rounded-full px-4 py-3 text-white transition-colors ${
                isActive
                  ? 'font-bold'
                  : 'hover:bg-[#181818]'
              }`}
            >
              <div className="relative">
                <Icon className="h-6 w-6" />
                {showBadge && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#1DA1F2] px-1.5 text-xs font-bold text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-xl">{item.label}</span>
            </Link>
          );
        })}

        {/* Post Button - 藍色 */}
        <Link
          href="/post"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1DA1F2] px-4 py-3 font-semibold text-white transition-colors hover:bg-[#1a8cd8]"
        >
          <PenTool className="h-5 w-5" />
          <span className="text-xl">Post</span>
        </Link>
      </nav>

      {/* User Menu at bottom */}
      {userMenu && <div className="mt-auto">{userMenu}</div>}
    </aside>
  );
}

