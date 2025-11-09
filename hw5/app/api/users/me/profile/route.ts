import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const updateProfileSchema = z.object({
  displayName: z.string().max(100).optional(),
  bio: z.string().max(280).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  bannerUrl: z.string().url().optional().nullable(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session || !(session as any).uid) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = updateProfileSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid data', errors: parsed.error.errors },
        { status: 400 }
      );
    }

    const userId = (session as any).uid as string;

    // 如果更新了 avatarUrl，同時更新 User.image
    if (parsed.data.avatarUrl !== undefined) {
      await prisma.user.update({
        where: { id: userId },
        data: { image: parsed.data.avatarUrl },
      });
    }

    // 更新或建立 Profile
    const profile = await prisma.profile.upsert({
      where: { userId },
      update: parsed.data,
      create: {
        userId,
        ...parsed.data,
      },
    });

    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}






