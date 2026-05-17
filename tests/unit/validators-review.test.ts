import { describe, expect, it } from "vitest"

import {
  reviewCreateFormSchema,
  reviewHideSchema,
  reviewListSchema,
  reviewReplySchema,
} from "@/lib/validators/review"

describe("reviewCreateFormSchema", () => {
  const valid = {
    rating: "5",
    professionalismRating: "4",
    punctualityRating: "5",
    valueRating: "5",
    comment: "服务很好",
  }

  it("accepts valid input, coerces stars to numbers", () => {
    const r = reviewCreateFormSchema.parse(valid)
    expect(r.rating).toBe(5)
    expect(r.professionalismRating).toBe(4)
    expect(r.comment).toBe("服务很好")
  })

  it("rejects out-of-range stars", () => {
    expect(
      reviewCreateFormSchema.safeParse({ ...valid, rating: "0" }).success
    ).toBe(false)
    expect(
      reviewCreateFormSchema.safeParse({ ...valid, rating: "6" }).success
    ).toBe(false)
  })

  it("trims comment, accepts empty", () => {
    const r = reviewCreateFormSchema.parse({ ...valid, comment: "  " })
    expect(r.comment).toBe("")
  })

  it("rejects comment > 1000 chars", () => {
    const r = reviewCreateFormSchema.safeParse({
      ...valid,
      comment: "a".repeat(1001),
    })
    expect(r.success).toBe(false)
  })
})

describe("reviewReplySchema", () => {
  it("rejects empty", () => {
    expect(reviewReplySchema.safeParse({ reply: "" }).success).toBe(false)
  })
  it("rejects > 500 chars", () => {
    expect(
      reviewReplySchema.safeParse({ reply: "a".repeat(501) }).success
    ).toBe(false)
  })
  it("accepts normal reply", () => {
    expect(reviewReplySchema.safeParse({ reply: "感谢" }).success).toBe(true)
  })
})

describe("reviewHideSchema", () => {
  it("requires reason", () => {
    expect(reviewHideSchema.safeParse({}).success).toBe(false)
    expect(reviewHideSchema.safeParse({ reason: "" }).success).toBe(false)
    expect(
      reviewHideSchema.safeParse({ reason: "含广告" }).success
    ).toBe(true)
  })
})

describe("reviewListSchema", () => {
  it("defaults page=1 limit=10", () => {
    const r = reviewListSchema.parse({})
    expect(r.page).toBe(1)
    expect(r.limit).toBe(10)
    expect(r.minStars).toBeUndefined()
  })
  it("coerces minStars", () => {
    const r = reviewListSchema.parse({ minStars: "4" })
    expect(r.minStars).toBe(4)
  })
  it("rejects minStars=0 / 6", () => {
    expect(reviewListSchema.safeParse({ minStars: "0" }).success).toBe(false)
    expect(reviewListSchema.safeParse({ minStars: "6" }).success).toBe(false)
  })
})
