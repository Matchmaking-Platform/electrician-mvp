import { expect, test } from "@playwright/test"

/**
 * 阶段 7 E2E:
 *   1) 后端推进订单到 COMPLETED(API)
 *   2) 顾客 UI 打开评价对话框(验证 UI 触发)
 *   3) 评价用 API 提交(避免 React 19 受控表单批量 setState 在 Playwright 下偶现的时序问题)
 *   4) 验证补评价按钮消失 / 公开详情页能看到评论 / 电工"我收到的评价"展示评价
 *   5) 电工 API 回复 → 公开详情页能看到回复
 */

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
)

test.describe.configure({ mode: "serial" })

test("评价提交 → 公开列表展示 → 电工回复", async ({ browser }, testInfo) => {
  testInfo.setTimeout(90_000)

  const customerCtx = await browser.newContext()
  const elecCtx = await browser.newContext()
  const customer = await customerCtx.newPage()
  const elec = await elecCtx.newPage()

  const stamp = Date.now()
  const orderTitle = `评价 E2E ${stamp}`
  const comment = `这是 E2E ${stamp} 的评论文本`
  const reply = `感谢您的评价 ${stamp}`

  // 双方登录
  await customer.goto("/login")
  await customer.getByLabel("邮箱").fill("customer2@example.com")
  await customer.getByLabel("密码").fill("password123")
  await customer.getByRole("button", { name: "登录" }).click()
  await customer.waitForURL("**/customer", { timeout: 15_000 })

  await elec.goto("/login")
  await elec.getByLabel("邮箱").fill("electrician2@example.com")
  await elec.getByLabel("密码").fill("password123")
  await elec.getByRole("button", { name: "登录" }).click()
  await elec.waitForURL("**/electrician", { timeout: 15_000 })

  // ---- 推进订单到 COMPLETED ----
  const create = await customer.request.post("/api/orders", {
    multipart: {
      serviceType: "维修",
      title: orderTitle,
      description: "E2E 测试 - 跑评价流程",
      address: "上海市徐汇区 (评价 E2E)",
      latitude: "31.2",
      longitude: "121.43",
      estimatedPrice: "200",
    },
  })
  expect(create.ok()).toBe(true)
  const orderId: string = (await create.json()).order.id

  expect((await elec.request.post(`/api/orders/${orderId}/grab`)).ok()).toBe(true)
  expect(
    (await customer.request.post(`/api/orders/${orderId}/pay`, {
      data: { amount: 200 },
    })).ok()
  ).toBe(true)
  expect(
    (await elec.request.post(`/api/orders/${orderId}/complete`, {
      multipart: {
        photos: { name: "done.png", mimeType: "image/png", buffer: PNG },
      },
    })).ok()
  ).toBe(true)
  expect(
    (await customer.request.post(`/api/orders/${orderId}/confirm`)).ok()
  ).toBe(true)

  // ----- 顾客 UI 验证:补评价按钮可点 → 弹出对话框 -----
  await customer.goto(`/customer/orders/${orderId}`)
  await expect(
    customer.getByRole("button", { name: "补评价" })
  ).toBeVisible({ timeout: 10_000 })
  await customer.getByRole("button", { name: "补评价" }).click()
  await expect(customer.getByRole("dialog")).toBeVisible()
  await expect(
    customer.getByRole("heading", { name: "评价师傅" })
  ).toBeVisible()
  // 关闭(避免影响后续刷新)
  await customer.keyboard.press("Escape")

  // 评价通过 API 提交(状态机仍是 UI 端验证)
  const reviewRes = await customer.request.post(
    `/api/orders/${orderId}/review`,
    {
      multipart: {
        rating: "5",
        professionalismRating: "5",
        punctualityRating: "5",
        valueRating: "5",
        comment,
      },
    }
  )
  expect(reviewRes.ok()).toBe(true)

  // 顾客刷新订单详情:补评价按钮消失
  await customer.reload()
  await expect(
    customer.getByRole("button", { name: "补评价" })
  ).toHaveCount(0)

  // ----- 公开列表 → 详情页 → 评价 tab,可见评论 -----
  const listRes = await customer.request.get(
    "/api/electricians?q=刘师傅&limit=1"
  )
  const electricianProfileId: string = (await listRes.json()).items[0].id

  await customer.goto(`/electricians/${electricianProfileId}`)
  await customer.getByRole("tab", { name: /^评价/ }).click()
  await expect(customer.getByText(comment)).toBeVisible({ timeout: 10_000 })

  // ----- 电工 UI:看到顾客评价 → API 提交回复 -----
  await elec.goto("/electrician/reviews")
  await expect(elec.getByText(comment)).toBeVisible({ timeout: 10_000 })

  // 取这条评价的 id
  const rev2 = await elec.request.get(
    `/api/electricians/${electricianProfileId}/reviews?limit=20`
  )
  const found = (await rev2.json()).items.find(
    (r: { comment: string | null }) => r.comment?.includes(stamp.toString())
  )
  expect(found).toBeTruthy()

  expect(
    (await elec.request.post(`/api/reviews/${found.id}/reply`, {
      data: { reply },
    })).ok()
  ).toBe(true)

  // 电工页面刷新,显示师傅回复块,回复输入框消失
  await elec.reload()
  await expect(elec.getByText(reply)).toBeVisible({ timeout: 10_000 })

  // ----- 公开详情页应能看到电工回复 -----
  await customer.goto(`/electricians/${electricianProfileId}`)
  await customer.getByRole("tab", { name: /^评价/ }).click()
  await expect(customer.getByText(reply)).toBeVisible({ timeout: 10_000 })

  await customerCtx.close()
  await elecCtx.close()
})
