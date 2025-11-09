import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createPostSchema } from '@/lib/validators/post';

// GET: 取得所有草稿
export async function GET() {
  const session = await auth();
  if (!session || !(session as any).uid) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const uid = (session as any).uid as string;

  try {
    const drafts = await prisma.draft.findMany({
      where: { authorId: uid },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ ok: true, drafts });
  } catch (error) {
    console.error('Error fetching drafts:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// POST: 建立或更新草稿
export async function POST(req: Request) {
  const session = await auth();
  if (!session || !(session as any).uid) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = createPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid draft data' }, { status: 400 });
  }

  const uid = (session as any).uid as string;

  try {
    // 確保 content 至少是空字串（草稿可以為空）
    const content = parsed.data.content ?? '';
    
    // 如果提供了 draftId，則更新；否則創建新的
    if (body.draftId) {
      const draft = await prisma.draft.update({
        where: { id: body.draftId },
        data: { content },
      });
      return NextResponse.json({ ok: true, draft });
    } else {
      const draft = await prisma.draft.create({
        data: {
          authorId: uid,
          content,
        },
      });
      return NextResponse.json({ ok: true, draft });
    }
  } catch (error) {
    console.error('Error saving draft:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// DELETE: 刪除草稿
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session || !(session as any).uid) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const draftId = searchParams.get('id');

  if (!draftId) {
    return NextResponse.json({ message: 'Draft ID required' }, { status: 400 });
  }

  const uid = (session as any).uid as string;

  try {
    // 確認草稿屬於當前用戶
    const draft = await prisma.draft.findUnique({
      where: { id: draftId },
    });

    if (!draft || draft.authorId !== uid) {
      return NextResponse.json({ message: 'Draft not found' }, { status: 404 });
    }

    await prisma.draft.delete({
      where: { id: draftId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting draft:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}








