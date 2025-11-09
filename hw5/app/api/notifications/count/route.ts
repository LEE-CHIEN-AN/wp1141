import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/utils/api-error-handler';

// GET: 取得未讀通知數量
export async function GET(req: Request) {
  const session = await auth();
  if (!session || !(session as any).uid) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const uid = (session as any).uid as string;

  try {
    const count = await prisma.notification.count({
      where: {
        userId: uid,
        read: false,
      },
    });

    return NextResponse.json({ ok: true, count });
  } catch (error) {
    return handleApiError(error);
  }
}




