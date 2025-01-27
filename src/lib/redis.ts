import { Redis } from '@upstash/redis'

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
})

// Key format: notification:${fid}
const getNotificationKey = (fid: number) => `notification:${fid}`

export type NotificationDetails = {
  token: string
  url: string
}

export async function saveNotificationDetails(fid: number, details: NotificationDetails) {
  const key = getNotificationKey(fid)
  await redis.set(key, details)
  console.log(`Saved notification details for FID ${fid}:`, details)
}

export async function getNotificationDetails(fid: number): Promise<NotificationDetails | null> {
  const key = getNotificationKey(fid)
  const details = await redis.get<NotificationDetails>(key)
  return details
}

export async function removeNotificationDetails(fid: number) {
  const key = getNotificationKey(fid)
  await redis.del(key)
  console.log(`Removed notification details for FID ${fid}`)
} 