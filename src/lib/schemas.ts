import { z } from 'zod';

export const eventHeaderSchema = z.object({
  fid: z.number(),
  type: z.string(),
  key: z.string(),
});

export const notificationDetailsSchema = z.object({
  token: z.string(),
  url: z.string(),
});

export const eventPayloadSchema = z.object({
  event: z.enum(['frame_added', 'frame_removed', 'notifications_enabled', 'notifications_disabled']),
  notificationDetails: notificationDetailsSchema.optional(),
});

export const eventSchema = z.object({
  header: z.string(),
  payload: z.string(),
  signature: z.string(),
}); 