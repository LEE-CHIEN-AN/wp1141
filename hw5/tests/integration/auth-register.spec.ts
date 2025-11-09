import { describe, it, expect } from 'vitest';
import { userIdSchema } from '@/lib/validators/user';

describe('auth/register', () => {
  it('userId schema accepts valid values', () => {
    expect(userIdSchema.parse('abc')).toBe('abc');
    expect(userIdSchema.parse('ric_123')).toBe('ric_123');
  });
});









