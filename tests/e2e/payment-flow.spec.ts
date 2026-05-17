import { expect, test } from "@playwright/test"

/**
 * 阶段 6 主流程 E2E:
 *   1) 顾客建单 → 电工抢单(API)
 *   2) 顾客 API 付款,paymentStatus=HELD
 *   3) 电工 API 上传完工凭证,status=AWAITING_CONFIRMATION
 *   4) 顾客在 UI 上点"确认完工",订单 COMPLETED + RELEASED
 *   5) 电工钱包 UI 看到余额上涨
 *
 * 支付 + 完工上传走 API(更稳),只在最终确认与余额展示上验 UI。
 */

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
)

test.describe.configure({ mode: "serial" })

test("付款 → 完工 → 确认 → 电工余额上涨", async ({ browser }, testInfo) => {
  testInfo.setTimeout(90_000)

  const customerCtx = await browser.newContext()
  const elecCtx = await browser.newContext()
  const customer = await customerCtx.newPage()
  const elec = await elecCtx.newPage()

  const stamp = Date.now()
  const orderTitle = `付款 E2E ${stamp}`

  // 顾客登录
  await customer.goto("/login")
  await customer.getByLabel("邮箱").fill("customer3@example.com")
  await customer.getByLabel("密码").fill("password123")
  await customer.getByRole("button", { name: "登录" }).click()
  await customer.waitForURL("**/customer", { timeout: 15_000 })

  // 电工登录
  await elec.goto("/login")
  await elec.getByLabel("邮箱").fill("electrician1@example.com")
  await elec.getByLabel("密码").fill("password123")
  await elec.getByRole("button", { name: "登录" }).click()
  await elec.waitForURL("**/electrician", { timeout: 15_000 })

  // 记录电工付款前余额
  const balBefore = await readWalletBalance(elec)

  // 顾客下单
  const create = await customer.request.post("/api/orders", {
    multipart: {
      serviceType: "维修",
      title: orderTitle,
      description: "付款 E2E:阳台插座维修",
      address: "上海市浦东新区 (付款 E2E)",
      latitude: "31.23",
      longitude: "121.59",
      estimatedPrice: "300",
    },
  })
  expect(create.ok()).toBe(true)
  const orderId: string = (await create.json()).order.id

  // 电工抢单
  const grab = await elec.request.post(`/api/orders/${orderId}/grab`)
  expect(grab.ok()).toBe(true)

  // ----- 顾客付款(API) -----
  const pay = await customer.request.post(`/api/orders/${orderId}/pay`, {
    data: { amount: 300 },
  })
  expect(pay.ok()).toBe(true)
  expect((await pay.json()).mode).toBe("mock")

  // ----- 电工上传完工凭证(API) -----
  const complete = await elec.request.post(
    `/api/orders/${orderId}/complete`,
    {
      multipart: {
        photos: {
          name: "done.png",
          mimeType: "image/png",
          buffer: PNG,
        },
      },
    }
  )
  expect(complete.ok()).toBe(true)

  // ----- 顾客 UI 看到"待确认完工"并点击确认 -----
  await customer.goto(`/customer/orders/${orderId}`)
  await expect(
    customer.getByText("待确认完工", { exact: true })
  ).toBeVisible({ timeout: 15_000 })
  customer.once("dialog", (d) => d.accept()) // window.confirm
  await customer.getByRole("button", { name: "确认完工" }).click()

  await expect(
    customer.getByText("已完成", { exact: true })
  ).toBeVisible({ timeout: 15_000 })
  await expect(customer.getByText("已结算", { exact: true })).toBeVisible()

  // ----- 电工钱包余额上涨 >= 300 -----
  const balAfter = await readWalletBalance(elec)
  expect(balAfter - balBefore).toBeGreaterThanOrEqual(300)

  await customerCtx.close()
  await elecCtx.close()
})

async function readWalletBalance(page: import("@playwright/test").Page) {
  await page.goto("/electrician/wallet")
  const text =
    (await page
      .locator("text=可用余额")
      .locator("..")
      .textContent()) ?? ""
  const m = text.match(/¥(\d+(?:\.\d+)?)/)
  if (!m) throw new Error("无法解析余额:" + text)
  return Number(m[1])
}
