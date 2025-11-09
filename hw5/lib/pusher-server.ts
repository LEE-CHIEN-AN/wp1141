import Pusher from 'pusher';
import { getPostChannelName, getFollowingChannelName } from './pusher-channels';

type MockEvent = {
  event: string;
  payload: any;
  timestamp: number;
};

const globalForPusher = globalThis as typeof globalThis & {
  __pusherServer?: Pusher | null;
  __mockPusherStore?: Map<string, MockEvent[]>;
};

const isMockPusher = process.env.MOCK_PUSHER === '1';

const requiredEnv = [
  process.env.PUSHER_APP_ID,
  process.env.PUSHER_KEY,
  process.env.PUSHER_SECRET,
  process.env.PUSHER_CLUSTER,
];

const isConfigured = requiredEnv.every((value) => value && value.length > 0);

function getMockStore() {
  if (!globalForPusher.__mockPusherStore) {
    globalForPusher.__mockPusherStore = new Map();
  }
  return globalForPusher.__mockPusherStore!;
}

function createPusherServer(): Pusher | null {
  if (isMockPusher || !isConfigured) {
    return null;
  }

  if (!globalForPusher.__pusherServer) {
    globalForPusher.__pusherServer = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.PUSHER_CLUSTER!,
      useTLS: true,
    });
  }

  return globalForPusher.__pusherServer ?? null;
}

const pusherServer = createPusherServer();

export const isPusherAvailable = Boolean(pusherServer);
export const isPusherMockEnabled = isMockPusher || !isConfigured;

function enqueueMockEvent(channel: string, event: string, payload: any) {
  const store = getMockStore();
  const events = store.get(channel) ?? [];
  events.push({ event, payload, timestamp: Date.now() });
  store.set(channel, events);
}

export function pushMockEvent(channel: string, event: string, payload: any) {
  if (!isPusherMockEnabled) {
    throw new Error('Mock pusher is not enabled');
  }

  enqueueMockEvent(channel, event, payload);
}

export function consumeMockEvents(channel: string): MockEvent[] {
  if (!isPusherMockEnabled) {
    return [];
  }

  const store = getMockStore();
  const events = store.get(channel) ?? [];
  store.set(channel, []);
  return events;
}

async function triggerChannelEvent(channel: string, event: string, payload: any) {
  if (pusherServer) {
    await pusherServer.trigger(channel, event, payload);
  } else {
    // Mock 模式下，存儲事件並嘗試通過 HTTP 觸發客戶端事件
    enqueueMockEvent(channel, event, payload);
    
    // 嘗試通過 HTTP 觸發客戶端事件（如果服務器正在運行）
    // 這需要在 Next.js 應用程序中運行，所以我們通過 fetch 調用 API
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      await fetch(`${baseUrl}/api/pusher/mock/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, event, payload }),
      }).catch(() => {
        // 忽略錯誤，因為這可能是在腳本中運行，服務器可能沒有運行
      });
    } catch (error) {
      // 忽略錯誤
    }
  }
}

export async function triggerPostLikeUpdated(postId: string, payload: { postId: string; likes: number; userId?: string; liked?: boolean }) {
  const channel = getPostChannelName(postId);
  await triggerChannelEvent(channel, 'like:updated', payload);
}

export async function triggerPostCommentCreated(
  postId: string,
  payload: { postId: string; comment: any; count: number }
) {
  const channel = getPostChannelName(postId);
  await triggerChannelEvent(channel, 'comment:created', payload);
}

export async function triggerPostDeleted(postId: string) {
  const channel = getPostChannelName(postId);
  await triggerChannelEvent(channel, 'post:deleted', { postId });
}

export async function triggerNewPostForFollowers(
  followerId: string,
  payload: {
    postId: string;
    author: {
      id: string;
      name: string | null;
      userId: string | null;
      image: string | null;
    };
  }
) {
  const channel = getFollowingChannelName(followerId);
  console.log(`📢 Triggering new:post event for follower ${followerId} on channel ${channel}`);
  await triggerChannelEvent(channel, 'new:post', payload);
}

export function getPusherServerInstance() {
  return pusherServer;
}
