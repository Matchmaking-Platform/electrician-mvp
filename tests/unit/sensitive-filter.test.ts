import { describe, expect, it } from "vitest"

import { filterSensitive } from "@/lib/sensitive-filter"

describe("filterSensitive", () => {
  it("keeps innocuous text intact", () => {
    const r = filterSensitive("师傅你好,明天上午方便吗?")
    expect(r.safe).toBe("师傅你好,明天上午方便吗?")
    expect(r.redacted).toBe(false)
  })

  it("redacts a mainland mobile number", () => {
    const r = filterSensitive("我的手机是 13800001234,方便联系")
    expect(r.safe).toContain("[屏蔽]")
    expect(r.safe).not.toContain("13800001234")
    expect(r.redacted).toBe(true)
  })

  it("redacts wechat hint patterns", () => {
    const r = filterSensitive("方便的话加我微信 abcdef123")
    expect(r.safe).toContain("[屏蔽]")
    expect(r.redacted).toBe(true)
  })

  it("redacts QQ-style references", () => {
    const r = filterSensitive("QQ:123456789 也行")
    expect(r.safe).toContain("[屏蔽]")
    expect(r.redacted).toBe(true)
  })

  it("redacts keyword 加我微信 even without number", () => {
    const r = filterSensitive("可以加我微信细聊")
    expect(r.safe).toContain("[屏蔽]")
    expect(r.redacted).toBe(true)
  })

  it("redacts landline-like 7-8 digit local numbers", () => {
    const r = filterSensitive("电话 021-12345678")
    expect(r.safe).not.toContain("12345678")
    expect(r.redacted).toBe(true)
  })
})
