import { z } from 'zod';

export const postMediaSchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1),
  type: z.enum(['IMAGE', 'VIDEO']),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  duration: z.number().positive().optional(),
});

// Count logic handled elsewhere; here only basic constraints
export const createPostSchema = z
  .object({
    content: z.string().max(2000).optional(),
    media: z.array(postMediaSchema).max(4).optional(),
  })
  .superRefine((data, ctx) => {
    const contentLength = data.content?.trim().length ?? 0;
    const mediaLength = data.media?.length ?? 0;

    if (contentLength === 0 && mediaLength === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Post must include text or media',
        path: ['content'],
      });
    }
  });

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type PostMediaInput = z.infer<typeof postMediaSchema>;



