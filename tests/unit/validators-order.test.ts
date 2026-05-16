import { describe, expect, it } from "vitest"

import {
  orderCreateFormSchema,
  orderListSchema,
} from "@/lib/validators/order"

describe("orderCreateFormSchema", () => {
  const valid = {
    serviceType: "维修",
    title: "卫生间灯不亮",
    description: "今早起来发现卫生间主灯完全不亮,换灯泡也没用。",
    address: "上海市浦东新区张江路 88 号",
    latitude: "31.21",
    longitude: "121.59",
  }

  it("accepts valid minimum input", () => {
    const r = orderCreateFormSchema.safeParse(valid)
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.latitude).toBe(31.21)
      expect(r.data.scheduledAt).toBeNull()
    }
  })

  it("rejects unknown serviceType", () => {
    const r = orderCreateFormSchema.safeParse({
      ...valid,
      serviceType: "管道",
    })
    expect(r.success).toBe(false)
  })

  it("rejects short title", () => {
    const r = orderCreateFormSchema.safeParse({ ...valid, title: "x" })
    expect(r.success).toBe(false)
  })

  it("rejects short description", () => {
    const r = orderCreateFormSchema.safeParse({ ...valid, description: "xx" })
    expect(r.success).toBe(false)
  })

  it("rejects out-of-range lat/lng", () => {
    const r1 = orderCreateFormSchema.safeParse({ ...valid, latitude: "100" })
    const r2 = orderCreateFormSchema.safeParse({ ...valid, longitude: "200" })
    expect(r1.success).toBe(false)
    expect(r2.success).toBe(false)
  })

  it("parses ISO scheduledAt into Date", () => {
    const r = orderCreateFormSchema.parse({
      ...valid,
      scheduledAt: "2026-06-01T10:00:00.000Z",
    })
    expect(r.scheduledAt).toBeInstanceOf(Date)
  })

  it("treats empty scheduledAt as null", () => {
    const r = orderCreateFormSchema.parse({ ...valid, scheduledAt: "" })
    expect(r.scheduledAt).toBeNull()
  })

  it("coerces estimatedPrice as number", () => {
    const r = orderCreateFormSchema.parse({ ...valid, estimatedPrice: "300" })
    expect(r.estimatedPrice).toBe(300)
  })

  it("rejects negative estimatedPrice", () => {
    const r = orderCreateFormSchema.safeParse({
      ...valid,
      estimatedPrice: "-1",
    })
    expect(r.success).toBe(false)
  })
})

describe("orderListSchema", () => {
  it("defaults scope=mine, page=1, limit=20", () => {
    const r = orderListSchema.parse({})
    expect(r.scope).toBe("mine")
    expect(r.page).toBe(1)
    expect(r.limit).toBe(20)
    expect(r.status).toBeUndefined()
  })

  it("parses comma-separated status filter", () => {
    const r = orderListSchema.parse({ status: "PENDING,ACCEPTED" })
    expect(r.status).toEqual(["PENDING", "ACCEPTED"])
  })

  it("rejects unknown scope", () => {
    expect(orderListSchema.safeParse({ scope: "all" }).success).toBe(false)
  })
})
