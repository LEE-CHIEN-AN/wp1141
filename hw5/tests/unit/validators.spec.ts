import { describe, it, expect } from 'vitest';
import { userIdSchema } from '@/lib/validators/user';
import { createPostSchema } from '@/lib/validators/post';

describe('validators', () => {
  it('accepts valid userId and lowercases', () => {
    const parsed = userIdSchema.parse('Ric_123');
    expect(parsed).toBe('ric_123');
  });

  it('rejects invalid userId', () => {
    expect(() => userIdSchema.parse('1bad')).toThrow();
    expect(() => userIdSchema.parse('ab')).toThrow();
  });

  it('post content length rules', () => {
    expect(() => createPostSchema.parse({ content: '' })).toThrow();
    expect(createPostSchema.parse({ content: 'hello' }).content).toBe('hello');
  });
});









