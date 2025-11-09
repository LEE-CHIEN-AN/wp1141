'use client';

import Pusher, { Channel as PusherChannel } from 'pusher-js';

type MockCallback = (data: any) => void;

class MockChannel {
  private callbacks: Record<string, Set<MockCallback>> = {};
  private broadcast: BroadcastChannel | null = null;

  constructor(private channelName: string) {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.broadcast = new BroadcastChannel(channelName);
      this.broadcast.onmessage = (event) => {
        const { eventName, payload } = event.data ?? {};
        if (!eventName) return;
        this.callbacks[eventName]?.forEach((cb) => cb(payload));
      };
    }
  }

  bind(eventName: string, callback: MockCallback) {
    if (!this.callbacks[eventName]) {
      this.callbacks[eventName] = new Set();
    }
    this.callbacks[eventName].add(callback);
  }

  unbind(eventName: string, callback: MockCallback) {
    this.callbacks[eventName]?.delete(callback);
  }

  unbind_all() {
    this.callbacks = {};
  }

  unsubscribe() {
    this.broadcast?.close();
    this.callbacks = {};
  }
}

class MockPusherClient {
  public readonly isMock = true;
  private channels = new Map<string, MockChannel>();

  constructor() {
    if (typeof window !== 'undefined' && !(window as any).__emitMockPusher) {
      (window as any).__emitMockPusher = (channelName: string, eventName: string, payload: any) => {
        if (!('BroadcastChannel' in window)) return;
        const channel = new BroadcastChannel(channelName);
        channel.postMessage({ eventName, payload });
        channel.close();
      };
    }
  }

  subscribe(channelName: string): MockChannel {
    if (!this.channels.has(channelName)) {
      this.channels.set(channelName, new MockChannel(channelName));
    }
    return this.channels.get(channelName)!;
  }

  unsubscribe(channelName: string) {
    const channel = this.channels.get(channelName);
    if (channel) {
      channel.unsubscribe();
      this.channels.delete(channelName);
    }
  }
}

const isMockClient = process.env.NEXT_PUBLIC_MOCK_PUSHER === '1';
const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
let client: Pusher | MockPusherClient | null = null;

export function getPusherClient() {
  if (typeof window === 'undefined') {
    return null;
  }

  if (client) {
    return client;
  }

  if (isMockClient || !key) {
    client = new MockPusherClient();
    return client;
  }

  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  client = new Pusher(key, {
    cluster: cluster,
    forceTLS: true,
    authEndpoint: '/api/pusher/auth',
    auth: {
      withCredentials: true,
    },
  });
  return client;
}

export type PusherClient = ReturnType<typeof getPusherClient>;
export type ClientChannel = PusherChannel | MockChannel;
