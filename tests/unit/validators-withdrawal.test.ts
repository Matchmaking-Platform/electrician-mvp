import { describe, expect, it } from "vitest"

import {
  withdrawalCreateSchema,
  withdrawalDecisionSchema,
} from "@/lib/validators/withdrawal"

describe("withdrawalCreateSchema", () => {
  const valid = {
    amount: 100,
    bankInfo: {
      bankName: "招商银行",
      accountName: "张三",
      accountNumber: "6217 0030 1234 5678",
    },
  }
  it("accepts valid input", () => {
    const r = withdrawalCreateSchema.safeParse(valid)
    expect(r.success).toBe(true)
  })
  it("rejects 0/negative amount", () => {
    expect(
      withdrawalCreateSchema.safeParse({ ...valid, amount: 0 }).success
    ).toBe(false)
    expect(
      withdrawalCreateSchema.safeParse({ ...valid, amount: -5 }).success
    ).toBe(false)
  })
  it("rejects too-short account number", () => {
    const bad = {
      ...valid,
      bankInfo: { ...valid.bankInfo, accountNumber: "1234" },
    }
    expect(withdrawalCreateSchema.safeParse(bad).success).toBe(false)
  })
  it("rejects letters in account number", () => {
    const bad = {
      ...valid,
      bankInfo: { ...valid.bankInfo, accountNumber: "62170030abcdef12345" },
    }
    expect(withdrawalCreateSchema.safeParse(bad).success).toBe(false)
  })
})

describe("withdrawalDecisionSchema", () => {
  it("paid action: adminNote optional", () => {
    expect(
      withdrawalDecisionSchema.safeParse({ action: "paid" }).success
    ).toBe(true)
    expect(
      withdrawalDecisionSchema.safeParse({
        action: "paid",
        adminNote: "已转账",
      }).success
    ).toBe(true)
  })
  it("reject action: requires adminNote", () => {
    expect(
      withdrawalDecisionSchema.safeParse({ action: "reject" }).success
    ).toBe(false)
    expect(
      withdrawalDecisionSchema.safeParse({
        action: "reject",
        adminNote: "信息不全",
      }).success
    ).toBe(true)
  })
  it("rejects unknown action", () => {
    expect(
      withdrawalDecisionSchema.safeParse({ action: "approve" }).success
    ).toBe(false)
  })
})
