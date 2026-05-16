import { describe, expect, it } from "vitest"

import {
  electricianListSchema,
  electricianProfileFormSchema,
  portfolioCaseInputSchema,
  priceItemInputSchema,
  selfProfilePatchSchema,
  verifyActionSchema,
} from "@/lib/validators/electrician"

describe("electricianListSchema", () => {
  it("defaults sort=comprehensive, page=1, limit=12", () => {
    const r = electricianListSchema.parse({})
    expect(r.sort).toBe("comprehensive")
    expect(r.page).toBe(1)
    expect(r.limit).toBe(12)
  })

  it("coerces numeric query params", () => {
    const r = electricianListSchema.parse({
      minRating: "4.5",
      minPrice: "50",
      maxPrice: "300",
      page: "2",
      limit: "20",
    })
    expect(r.minRating).toBe(4.5)
    expect(r.minPrice).toBe(50)
    expect(r.maxPrice).toBe(300)
    expect(r.page).toBe(2)
    expect(r.limit).toBe(20)
  })

  it("parses online=true|false as boolean", () => {
    expect(electricianListSchema.parse({ online: "true" }).online).toBe(true)
    expect(electricianListSchema.parse({ online: "false" }).online).toBe(false)
  })

  it("rejects unknown sort", () => {
    expect(
      electricianListSchema.safeParse({ sort: "nope" }).success
    ).toBe(false)
  })

  it("rejects negative rating", () => {
    expect(
      electricianListSchema.safeParse({ minRating: "-1" }).success
    ).toBe(false)
  })

  it("clamps page <= 1000", () => {
    expect(electricianListSchema.safeParse({ page: "9999" }).success).toBe(false)
  })
})

describe("electricianProfileFormSchema (onboarding)", () => {
  it("parses comma-separated serviceAreas", () => {
    const r = electricianProfileFormSchema.parse({
      serviceAreas: "上海市浦东新区, 上海市黄浦区,上海市虹口区",
    })
    expect(r.serviceAreas).toEqual([
      "上海市浦东新区",
      "上海市黄浦区",
      "上海市虹口区",
    ])
  })

  it("parses JSON array serviceAreas", () => {
    const r = electricianProfileFormSchema.parse({
      serviceAreas: JSON.stringify(["A", "B"]),
    })
    expect(r.serviceAreas).toEqual(["A", "B"])
  })

  it("rejects empty serviceAreas", () => {
    const r = electricianProfileFormSchema.safeParse({ serviceAreas: " " })
    expect(r.success).toBe(false)
  })

  it("rejects yearsExperience > 60", () => {
    const r = electricianProfileFormSchema.safeParse({
      serviceAreas: "A",
      yearsExperience: "80",
    })
    expect(r.success).toBe(false)
  })
})

describe("selfProfilePatchSchema", () => {
  it("rejects empty body (must include at least one field)", () => {
    const r = selfProfilePatchSchema.safeParse({})
    expect(r.success).toBe(false)
  })

  it("accepts isOnline only", () => {
    const r = selfProfilePatchSchema.safeParse({ isOnline: true })
    expect(r.success).toBe(true)
  })

  it("coerces baseHourlyRate", () => {
    const r = selfProfilePatchSchema.parse({ baseHourlyRate: "150" })
    expect(r.baseHourlyRate).toBe(150)
  })

  it("rejects serviceAreas with > 20 entries", () => {
    const r = selfProfilePatchSchema.safeParse({
      serviceAreas: Array.from({ length: 21 }, (_, i) => `区${i}`),
    })
    expect(r.success).toBe(false)
  })
})

describe("portfolioCaseInputSchema", () => {
  it("accepts minimal title only", () => {
    const r = portfolioCaseInputSchema.parse({ title: "案例 A" })
    expect(r.images).toEqual([])
    expect(r.description).toBe("")
  })

  it("rejects empty title", () => {
    expect(
      portfolioCaseInputSchema.safeParse({ title: "" }).success
    ).toBe(false)
  })

  it("rejects images > 8", () => {
    const images = Array.from({ length: 9 }, (_, i) => `/uploads/${i}.png`)
    expect(
      portfolioCaseInputSchema.safeParse({ title: "x", images }).success
    ).toBe(false)
  })
})

describe("priceItemInputSchema", () => {
  it("rejects negative price", () => {
    const r = priceItemInputSchema.safeParse({
      serviceType: "维修",
      name: "x",
      price: -1,
      unit: "项",
    })
    expect(r.success).toBe(false)
  })

  it("coerces price as number", () => {
    const r = priceItemInputSchema.parse({
      serviceType: "维修",
      name: "x",
      price: "120",
      unit: "项",
    })
    expect(r.price).toBe(120)
  })
})

describe("verifyActionSchema (discriminated union)", () => {
  it("approve needs no reason", () => {
    expect(verifyActionSchema.safeParse({ action: "approve" }).success).toBe(true)
  })
  it("reject requires reason", () => {
    expect(verifyActionSchema.safeParse({ action: "reject" }).success).toBe(false)
    expect(
      verifyActionSchema.safeParse({ action: "reject", reason: "理由" }).success
    ).toBe(true)
  })
  it("unknown action rejected", () => {
    expect(
      verifyActionSchema.safeParse({ action: "ignore" }).success
    ).toBe(false)
  })
})
