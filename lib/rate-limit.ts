/**
 * 极简内存限流器。
 * 缺陷:不跨进程、不跨实例。MVP 够用,生产换 upstash/ratelimit 或 Redis。
 */
type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfter: number }

/**
 * @param key      唯一标识(例 `register:1.2.3.4`)
 * @param limit    时间窗口内最多次数
 * @param windowMs 窗口长度(毫秒)
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: limit - 1 }
  }
  if (bucket.count >= limit) {
    return {
      ok: false,
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
    }
  }
  bucket.count++
  return { ok: true, remaining: limit - bucket.count }
}

/** 测试用:清空所有桶 */
export function __resetRateLimitForTests() {
  buckets.clear()
}
