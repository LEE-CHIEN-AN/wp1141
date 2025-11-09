import { NextResponse } from 'next/server';
import { auth, update } from '@/lib/auth';
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
    
    // 更新 session 中的 userId（即使失敗也不影響註冊流程）
    try {
      await update({
        userId: user.userId,
      });
    } catch (updateError) {
      console.error('Error updating session:', updateError);
      // 即使 session 更新失敗，也繼續返回成功（因為資料庫已經更新了）
    }
    
    return NextResponse.json({ ok: true, userId: user.userId });
  } catch (e: any) {
    console.error('Error in register API:', e);
    if (e?.code === 'P2002') {
      return NextResponse.json({ message: 'UserID is taken' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Server error', error: e?.message }, { status: 500 });
  }
}


