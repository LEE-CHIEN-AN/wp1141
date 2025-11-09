import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPusherServerInstance, getPostChannelName, isPusherMockEnabled } from '@/lib/pusher-server';

function isChannelAllowed(channelName: string, uid: string) {
  if (channelName.startsWith('private-post-')) {
    return true;
  }

  if (channelName.startsWith('private-user-')) {
    const suffix = channelName.replace('private-user-', '');
    return suffix === uid;
  }

  if (channelName.startsWith('private-following-')) {
    const suffix = channelName.replace('private-following-', '');
    return suffix === uid; // 只允許用戶訂閱自己的 following 頻道
  }

  return false;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || !(session as any).uid) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const uid = (session as any).uid as string;
  const contentType = req.headers.get('content-type') || '';

  let socketId: string | null = null;
  let channelName: string | null = null;

  if (contentType.includes('application/json')) {
    const body = await req.json().catch(() => ({}));
    socketId = body?.socket_id ?? null;
    channelName = body?.channel_name ?? null;
  } else {
    const formData = await req.formData();
    socketId = (formData.get('socket_id') as string) ?? null;
    channelName = (formData.get('channel_name') as string) ?? null;
  }

  if (!socketId || !channelName || !isChannelAllowed(channelName, uid)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  if (isPusherMockEnabled) {
    // Mock 模式下不需要實際簽名，直接允許
    return NextResponse.json({ ok: true, channel: channelName, mock: true });
  }

  const pusher = getPusherServerInstance();
  if (!pusher) {
    return NextResponse.json({ message: 'Pusher not configured' }, { status: 500 });
  }

  const authResponse = pusher.authorizeChannel(socketId, channelName);
  return NextResponse.json(authResponse);
}




