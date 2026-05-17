import { describe, expect, it } from "vitest"

import {
  canAdminResolveDispute,
  canCustomerCancel,
  canCustomerConfirm,
  canCustomerDispute,
  canElectricianComplete,
  canPay,
  computePayout,
} from "@/lib/order-state"

const o = (
  status: Parameters<typeof canPay>[0]["status"],
  paymentStatus: Parameters<typeof canPay>[0]["paymentStatus"]
) => ({ status, paymentStatus })

describe("canCustomerCancel", () => {
  it("true only when PENDING", () => {
    expect(canCustomerCancel(o("PENDING", "UNPAID"))).toBe(true)
    expect(canCustomerCancel(o("ACCEPTED", "UNPAID"))).toBe(false)
    expect(canCustomerCancel(o("COMPLETED", "RELEASED"))).toBe(false)
  })
})

describe("canPay", () => {
  it("true only when ACCEPTED + UNPAID", () => {
    expect(canPay(o("ACCEPTED", "UNPAID"))).toBe(true)
    expect(canPay(o("ACCEPTED", "HELD"))).toBe(false)
    expect(canPay(o("PENDING", "UNPAID"))).toBe(false)
  })
})

describe("canElectricianComplete", () => {
  it("requires ACCEPTED + HELD (paid)", () => {
    expect(canElectricianComplete(o("ACCEPTED", "HELD"))).toBe(true)
    expect(canElectricianComplete(o("ACCEPTED", "UNPAID"))).toBe(false)
    expect(canElectricianComplete(o("AWAITING_CONFIRMATION", "HELD"))).toBe(false)
  })
})

describe("canCustomerConfirm / Dispute", () => {
  it("both require AWAITING_CONFIRMATION + HELD", () => {
    expect(canCustomerConfirm(o("AWAITING_CONFIRMATION", "HELD"))).toBe(true)
    expect(canCustomerDispute(o("AWAITING_CONFIRMATION", "HELD"))).toBe(true)
    expect(canCustomerConfirm(o("ACCEPTED", "HELD"))).toBe(false)
    expect(canCustomerDispute(o("ACCEPTED", "HELD"))).toBe(false)
  })
})

describe("canAdminResolveDispute", () => {
  it("only DISPUTED", () => {
    expect(canAdminResolveDispute(o("DISPUTED", "HELD"))).toBe(true)
    expect(canAdminResolveDispute(o("COMPLETED", "RELEASED"))).toBe(false)
  })
})

describe("computePayout", () => {
  it("zero commission → all to electrician", () => {
    const r = computePayout(300, 0)
    expect(r.commission).toBe(0)
    expect(r.electricianPayout).toBe(300)
  })

  it("15% commission on 300 → 45 / 255", () => {
    const r = computePayout(300, 0.15)
    expect(r.commission).toBe(45)
    expect(r.electricianPayout).toBe(255)
  })

  it("rounds to 2 decimals", () => {
    const r = computePayout(123.45, 0.15)
    // 123.45 * 0.15 = 18.5175 → 18.52
    expect(r.commission).toBe(18.52)
    expect(r.electricianPayout).toBe(123.45 - 18.52)
  })
})
