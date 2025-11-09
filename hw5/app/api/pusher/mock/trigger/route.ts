import { NextResponse } from 'next/server';
import { pushMockEvent, isPusherMockEnabled } from '@/lib/pusher-server';

export async function POST(req: Request) {
  if (!isPusherMockEnabled) {
    return NextResponse.json({ message: 'Not available' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const channel = body?.channel as string | undefined;
  const event = body?.event as string | undefined;
  const payload = body?.payload;

  if (!channel || !event) {
    return NextResponse.json({ message: 'channel and event are required' }, { status: 400 });
  }

  pushMockEvent(channel, event, payload);
  return NextResponse.json({ ok: true });
}







