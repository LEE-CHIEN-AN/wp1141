import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.stubEnv('MOCK_PUSHER', '1');

describe('pusher-server mock', () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  it('queues like updated events in mock mode', async () => {
    const { triggerPostLikeUpdated, consumeMockEvents } = await import('@/lib/pusher-server');
    const { getPostChannelName } = await import('@/lib/pusher-channels');

    await triggerPostLikeUpdated('test-post', {
      postId: 'test-post',
      likes: 5,
      userId: 'user-1',
      liked: true,
    });

    const events = consumeMockEvents(getPostChannelName('test-post'));
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('like:updated');
    expect(events[0].payload).toMatchObject({ postId: 'test-post', likes: 5, liked: true });
  });
});







