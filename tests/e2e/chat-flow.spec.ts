import { expect, test } from "@playwright/test"

/**
 * 阶段 5 主流程 E2E:
 *   - 顾客在 context1 下单 → 电工在 context2 抢单
 *   - 顾客 + 电工同时进各自订单详情页
 *   - 顾客发"你好" → 电工实时收到
 *   - 电工回"已收到" → 顾客实时收到
 *   - 顾客发含手机号的消息 → 被屏蔽为 [屏蔽]
 *
 * 两个 context 模拟两台设备/两个浏览器,避免 cookie 串。
 */

test.describe.configure({ mode: "serial" })

test("两端实时聊天 + 敏感词屏蔽", async ({ browser }, testInfo) => {
  testInfo.setTimeout(90_000)

  const customerCtx = await browser.newContext()
  const elecCtx = await browser.newContext()
  const customer = await customerCtx.newPage()
  const elec = await elecCtx.newPage()

  const stamp = Date.now()
  const orderTitle = `聊天 E2E ${stamp}`

  // -------- 顾客登录 + 下单(走 UI 但跳地图详细交互,用 API) --------
  await customer.goto("/login")
  await customer.getByLabel("邮箱").fill("customer2@example.com")
  await customer.getByLabel("密码").fill("password123")
  await customer.getByRole("button", { name: "登录" }).click()
  await customer.waitForURL("**/customer", { timeout: 15_000 })

  // 用 API 直接下单(已在阶段 4 测过完整 UI 流)
  const createRes = await customer.request.post("/api/orders", {
    multipart: {
      serviceType: "维修",
      title: orderTitle,
      description: "聊天 E2E 测试单,我等师傅。",
      address: "上海市浦东新区张江路 (E2E 聊天测试)",
      latitude: "31.23",
      longitude: "121.59",
    },
  })
  expect(createRes.ok()).toBe(true)
  const created = await createRes.json()
  const orderId: string = created.order.id

  // -------- 电工登录 + 抢单 --------
  await elec.goto("/login")
  await elec.getByLabel("邮箱").fill("electrician1@example.com")
  await elec.getByLabel("密码").fill("password123")
  await elec.getByRole("button", { name: "登录" }).click()
  await elec.waitForURL("**/electrician", { timeout: 15_000 })

  const grabRes = await elec.request.post(`/api/orders/${orderId}/grab`)
  expect(grabRes.ok()).toBe(true)

  // -------- 两端打开订单详情 --------
  await customer.goto(`/customer/orders/${orderId}`)
  await elec.goto(`/electrician/orders/${orderId}`)

  // 等 ChatPanel 连接成功
  await expect(customer.getByText("已连接")).toBeVisible({ timeout: 15_000 })
  await expect(elec.getByText("已连接")).toBeVisible({ timeout: 15_000 })

  // 等彼此的 presence:打开后会广播 "online: true"
  await expect(customer.getByText("对方在线")).toBeVisible({ timeout: 10_000 })
  await expect(elec.getByText("对方在线")).toBeVisible({ timeout: 10_000 })

  // -------- 顾客发 "你好" --------
  await customer
    .getByPlaceholder(/说点什么/)
    .fill("师傅你好,大概什么时候能到?")
  await customer.getByRole("button", { name: "发送" }).click()

  // 电工应实时收到这条消息
  await expect(
    elec.getByText("师傅你好,大概什么时候能到?")
  ).toBeVisible({ timeout: 8000 })
  // 顾客自己也看到
  await expect(
    customer.getByText("师傅你好,大概什么时候能到?")
  ).toBeVisible()

  // -------- 电工回复 --------
  await elec.getByPlaceholder(/说点什么/).fill("你好,2 小时内到达")
  await elec.getByRole("button", { name: "发送" }).click()
  await expect(customer.getByText("你好,2 小时内到达")).toBeVisible({
    timeout: 8000,
  })

  // -------- 敏感词:顾客发手机号,应被屏蔽 --------
  await customer
    .getByPlaceholder(/说点什么/)
    .fill("我的手机是 13800001234 方便联系")
  await customer.getByRole("button", { name: "发送" }).click()

  // 屏蔽后两端看到的内容都不含 13800001234
  const filtered = "我的手机是 [屏蔽] 方便联系"
  await expect(customer.getByText(filtered)).toBeVisible({ timeout: 8000 })
  await expect(elec.getByText(filtered)).toBeVisible({ timeout: 8000 })
  // 验证号码确实没出现
  await expect(elec.getByText("13800001234")).toHaveCount(0)

  await customerCtx.close()
  await elecCtx.close()
})
