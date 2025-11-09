import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { userIdSchema } from '@/lib/validators/user';

export async function POST(req: Request) {
  const session = await auth();
  if (!session || !(session as any).uid) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = userIdSchema.safeParse(body?.userId);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid userId' }, { status: 400 });
  }

  const uid = (session as any).uid as string;

  // unique constraint is on User.userId
  try {
    const user = await prisma.user.update({
      where: { id: uid },
      data: { userId: parsed.data, profile: { upsert: { create: {}, update: {} } } },
    });
    
    // 注意：在 NextAuth v5 中，session 更新通過 JWT callback 中的 trigger: 'update' 處理
    // 如果需要立即更新 session，客戶端需要重新獲取 session
    // 這裡我們只更新資料庫，session 會在下次請求時自動更新
    
    return NextResponse.json({ ok: true, userId: user.userId });
  } catch (e: any) {
    console.error('Error in register API:', e);
    if (e?.code === 'P2002') {
      return NextResponse.json({ message: 'UserID is taken' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Server error', error: e?.message }, { status: 500 });
  }
}


