import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/utils/api-error-handler';

// POST: 加入/移除書籤
export async function POST(
  req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const session = await auth();
  if (!session || !(session as any).uid) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { postId } = await params;
  const uid = (session as any).uid as string;

  try {
    // 檢查是否已經加入書籤
    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        userId_postId: {
          userId: uid,
          postId,
        },
      },
    });

    let bookmarked = false;

    if (existingBookmark) {
      // 移除書籤
      await prisma.bookmark.delete({
        where: {
          userId_postId: {
            userId: uid,
            postId,
          },
        },
      });
      bookmarked = false;
    } else {
      // 加入書籤
      await prisma.bookmark.create({
        data: {
          userId: uid,
          postId,
        },
      });
      bookmarked = true;
    }

    return NextResponse.json({ ok: true, bookmarked });
  } catch (error) {
    return handleApiError(error);
  }
}

// GET: 檢查是否已加入書籤
export async function GET(
  req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const session = await auth();
  if (!session || !(session as any).uid) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { postId } = await params;
  const uid = (session as any).uid as string;

  try {
    const bookmark = await prisma.bookmark.findUnique({
      where: {
        userId_postId: {
          userId: uid,
          postId,
        },
      },
    });

    return NextResponse.json({ ok: true, bookmarked: !!bookmark });
  } catch (error) {
    return handleApiError(error);
  }
}




