import { afterEach, describe, expect, it, vi } from "vitest"

import { __resetRateLimitForTests, rateLimit } from "@/lib/rate-limit"

afterEach(() => {
  __resetRateLimitForTests()
  vi.useRealTimers()
})

describe("rateLimit", () => {
  it("allows up to `limit` calls within window", () => {
    for (let i = 0; i < 3; i++) {
      const r = rateLimit("k", 3, 60_000)
      expect(r.ok).toBe(true)
    }
  })

  it("rejects the call past the limit", () => {
    for (let i = 0; i < 3; i++) rateLimit("k", 3, 60_000)
    const r = rateLimit("k", 3, 60_000)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.retryAfter).toBeGreaterThan(0)
  })

  it("isolates buckets by key", () => {
    for (let i = 0; i < 3; i++) rateLimit("a", 3, 60_000)
    const a = rateLimit("a", 3, 60_000)
    const b = rateLimit("b", 3, 60_000)
    expect(a.ok).toBe(false)
    expect(b.ok).toBe(true)
  })

  it("resets after the window expires", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"))
    for (let i = 0; i < 3; i++) rateLimit("k", 3, 60_000)
    expect(rateLimit("k", 3, 60_000).ok).toBe(false)

    // 推进 61 秒,窗口应过期
    vi.setSystemTime(new Date("2026-01-01T00:01:01Z"))
    expect(rateLimit("k", 3, 60_000).ok).toBe(true)
  })

  it("returns remaining counts", () => {
    const r1 = rateLimit("k", 5, 60_000)
    if (r1.ok) expect(r1.remaining).toBe(4)
    const r2 = rateLimit("k", 5, 60_000)
    if (r2.ok) expect(r2.remaining).toBe(3)
  })
})
