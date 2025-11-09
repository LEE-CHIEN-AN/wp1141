import { NextResponse } from 'next/server';
import { consumeMockEvents, isPusherMockEnabled } from '@/lib/pusher-server';

export async function GET(req: Request) {
  if (!isPusherMockEnabled) {
    return NextResponse.json({ ok: false, events: [] }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const channel = searchParams.get('channel');

  if (!channel) {
    return NextResponse.json({ message: 'Channel required' }, { status: 400 });
  }

  const events = consumeMockEvents(channel);
  if (events.length > 0) {
    console.log(`📡 Mock API: Channel ${channel}, returning ${events.length} event(s)`);
  }
  return NextResponse.json({ ok: true, events });
}
