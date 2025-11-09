import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Sidebar } from './sidebar';
import { UserMenu } from './user-menu';
import { MobileBottomNav } from './mobile-bottom-nav';

export async function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const session = await auth();
  
  let user = null;
  if (session && (session as any).uid) {
    try {
      user = await prisma.user.findUnique({
        where: { id: (session as any).uid as string },
        select: {
          id: true,
          name: true,
          userId: true,
          image: true,
        },
      });
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  }

  return (
    <div className="flex min-h-screen bg-black">
      {/* Left Sidebar - Hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar
          userMenu={
            user ? (
              <UserMenu
                name={user.name}
                userId={user.userId || undefined}
                image={user.image || undefined}
              />
            ) : undefined
          }
        />
      </div>
      
      {/* Main Content */}
      <main className="flex-1 bg-black text-white">
        {children}
      </main>
      
      {/* Mobile Bottom Navigation - Only on mobile */}
      {user && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#2F3336] bg-black lg:hidden">
          <MobileBottomNav user={user} />
        </div>
      )}
    </div>
  );
}

