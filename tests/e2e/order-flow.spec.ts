import { expect, test } from "@playwright/test"

/**
 * 阶段 4 主流程 E2E:
 *   1) 顾客登录 → 多步表单下单(含点地图)→ 跳到订单详情(PENDING)
 *   2) 切电工 → 大厅看到订单 → 抢单 → 进入订单详情(ACCEPTED)
 *   3) 切回顾客 → 订单详情看到电工信息 + ACCEPTED 状态
 */

test.describe.configure({ mode: "serial" })

test("下单 → 抢单 → 双方看到 ACCEPTED 订单", async ({ page, context }) => {
  const stamp = Date.now()
  const orderTitle = `E2E 订单 ${stamp}`

  // ----- 1) 顾客登录 -----
  await page.goto("/login")
  await page.getByLabel("邮箱").fill("customer1@example.com")
  await page.getByLabel("密码").fill("password123")
  await page.getByRole("button", { name: "登录" }).click()
  await page.waitForURL("**/customer", { timeout: 15_000 })

  // ----- 2) 多步表单下单 -----
  await page.goto("/customer/orders/new")

  // step 0: 服务类型(默认"维修" 即可,直接下一步)
  await page.getByRole("button", { name: /下一步/ }).click()

  // step 1: 标题 + 描述
  await page.getByLabel("标题").fill(orderTitle)
  await page
    .getByLabel("详细描述")
    .fill("E2E 测试订单:厨房插座没电,已尝试重启总闸,无效。")
  await page.getByRole("button", { name: /下一步/ }).click()

  // step 2: 地址 + 地图。点地图中心录坐标。
  await page
    .getByLabel("详细地址")
    .fill("上海市浦东新区张江路 88 号(E2E 测试)")
  // 等地图容器出现,然后在它中心点一下,Leaflet 会响应 click 并填经纬度
  const mapLocator = page.locator(".leaflet-container")
  await expect(mapLocator).toBeVisible({ timeout: 15_000 })
  const box = await mapLocator.boundingBox()
  if (!box) throw new Error("map not laid out")
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  // 经纬度行出现说明坐标录入成功
  await expect(page.getByText(/经纬度:/)).toBeVisible({ timeout: 5000 })
  await page.getByRole("button", { name: /下一步/ }).click()

  // step 3: 时间 + 价格(可选,跳过)
  await page.getByRole("button", { name: /下一步/ }).click()

  // step 4: 提交
  await page.getByRole("button", { name: "确认发布" }).click()

  // 跳到订单详情页
  await page.waitForURL(/\/customer\/orders\/.+/, { timeout: 15_000 })
  await expect(page.getByText(orderTitle)).toBeVisible()
  await expect(page.getByText("待接单")).toBeVisible()

  // 记下订单 id
  const url = new URL(page.url())
  const orderId = url.pathname.split("/").pop()!
  expect(orderId).toBeTruthy()

  // ----- 3) 切到电工 1(浦东 + 黄浦 的 APPROVED 电工)-----
  await context.clearCookies()
  await page.goto("/login")
  await page.getByLabel("邮箱").fill("electrician1@example.com")
  await page.getByLabel("密码").fill("password123")
  await page.getByRole("button", { name: "登录" }).click()
  await page.waitForURL("**/electrician", { timeout: 15_000 })

  // 进大厅
  await page.goto("/electrician/orders/hall")
  await expect(page.getByRole("heading", { name: "接单大厅" })).toBeVisible()

  // 找到这个订单的卡片(标题命中)
  const card = page.locator("text=" + orderTitle).first()
  await expect(card).toBeVisible({ timeout: 15_000 })
  // 抢单按钮在同一张卡里
  await page
    .getByRole("button", { name: "抢单" })
    .first()
    .click()

  // 跳到电工侧订单详情
  await page.waitForURL(`**/electrician/orders/${orderId}`, { timeout: 15_000 })
  await expect(page.getByText(orderTitle)).toBeVisible()
  await expect(page.getByText("已接单", { exact: true })).toBeVisible()

  // ----- 4) 切回顾客,看详情已 ACCEPTED + 电工信息 -----
  await context.clearCookies()
  await page.goto("/login")
  await page.getByLabel("邮箱").fill("customer1@example.com")
  await page.getByLabel("密码").fill("password123")
  await page.getByRole("button", { name: "登录" }).click()
  await page.waitForURL("**/customer", { timeout: 15_000 })

  await page.goto(`/customer/orders/${orderId}`)
  await expect(page.getByText(orderTitle)).toBeVisible()
  await expect(page.getByText("已接单", { exact: true })).toBeVisible()
  await expect(page.getByText("已接单师傅")).toBeVisible()
  await expect(page.getByText("陈师傅")).toBeVisible() // electrician1 = 陈师傅
})
