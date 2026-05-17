import { describe, expect, it } from "vitest"

import { t } from "@/i18n"

describe("i18n.t()", () => {
  it("resolves nested paths", () => {
    expect(t("common.save")).toBe("保存")
    expect(t("auth.login")).toBe("登录")
    expect(t("order.status.PENDING")).toBe("待接单")
    expect(t("order.payment.HELD")).toBe("已托管")
  })

  it("returns the key when not found", () => {
    expect(t("nope.does.not.exist")).toBe("nope.does.not.exist")
  })

  it("returns the key when path lands on object, not string", () => {
    expect(t("order.status")).toBe("order.status")
  })
})
