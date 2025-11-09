import { test } from '@playwright/test';

test.describe.skip('Realtime updates (mock Pusher)', () => {
  test('updates like and comment counts across sessions', async () => {
    // TODO: Implement once mock transporter fully supports cross-context broadcasting.
  });
});
