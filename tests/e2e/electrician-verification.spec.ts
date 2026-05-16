import { expect, test } from "@playwright/test"

/**
 * 阶段 2 主流程 E2E:
 *   1) 注册新电工 → 自动登录
 *   2) 进入入驻页 → 上传资质 → 看到"审核中"
 *   3) 切换为管理员 → 找到该电工 → 通过审核
 *   4) 切回电工 → 进入工作台,看到欢迎语
 */

// 1x1 透明 PNG(67 字节,做测试占位)
const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
const PNG_BUFFER = Buffer.from(PNG_BASE64, "base64")
const png = (name: string) => ({
  name,
  mimeType: "image/png",
  buffer: PNG_BUFFER,
})

test.describe.configure({ mode: "serial" })

test("电工入驻全流程:注册 → 上传资质 → 管理员审核通过 → 进入工作台", async ({
  page,
  context,
}) => {
  const stamp = Date.now()
  const electricianEmail = `e2e-elec-${stamp}@example.com`
  const electricianName = `E2E 电工 ${stamp}`
  const electricianPassword = "password123"

  // ----- 1) 注册电工 -----
  await page.goto("/register/electrician")
  await page.getByLabel("姓名").fill(electricianName)
  await page.getByLabel("邮箱").fill(electricianEmail)
  await page.getByLabel("密码").fill(electricianPassword)
  await page.getByRole("button", { name: "注册" }).click()

  // 注册成功后会自动登录,首页根据 role 跳到 /electrician,
  // 然后 /electrician 因没 profile 又跳到 /electrician/onboarding。
  await page.waitForURL("**/electrician/onboarding", { timeout: 15_000 })
  await expect(
    page.getByRole("heading", { name: "电工入驻" })
  ).toBeVisible()

  // ----- 2) 上传资质 -----
  await page.getByLabel("个人简介").fill("E2E 测试用电工")
  await page.getByLabel("从业年限").fill("5")
  await page.getByLabel("参考时薪(元/小时)").fill("120")
  await page.getByLabel("服务区域").fill("上海市浦东新区, 上海市黄浦区")

  await page
    .locator('input[name="idCardFront"]')
    .setInputFiles(png("front.png"))
  await page
    .locator('input[name="idCardBack"]')
    .setInputFiles(png("back.png"))
  await page
    .locator('input[name="facePhoto"]')
    .setInputFiles(png("face.png"))

  await page.getByRole("button", { name: "提交审核" }).click()

  // 应出现"审核中"标题
  await expect(page.getByText("审核中", { exact: true })).toBeVisible({
    timeout: 10_000,
  })

  // ----- 3) 退出 → 登录管理员 -----
  await context.clearCookies()
  await page.goto("/login")
  await page.getByLabel("邮箱").fill("admin@example.com")
  await page.getByLabel("密码").fill("password123")
  await page.getByRole("button", { name: "登录" }).click()
  await page.waitForURL("**/admin", { timeout: 15_000 })

  // 进入电工审核列表
  await page.goto("/admin/electricians")
  await expect(page.getByRole("heading", { name: "电工资质审核" })).toBeVisible()

  // 在待审核 tab 找到这个电工
  await page.getByRole("tab", { name: /待审核/ }).click()
  const row = page.getByRole("row", { name: new RegExp(electricianEmail) })
  await expect(row).toBeVisible()
  await row.getByRole("link", { name: "查看" }).click()

  // 详情页 → 通过审核(CardTitle 是 div 不是 heading,用 getByText)
  await expect(page.getByText(electricianName).first()).toBeVisible()
  await page.getByRole("button", { name: "通过审核" }).click()
  // 操作成功后页面 refresh,按钮文本变成"已通过"
  await expect(
    page.getByRole("button", { name: "已通过" })
  ).toBeVisible({ timeout: 10_000 })

  // ----- 4) 退出 → 登录该电工 → 看到工作台 -----
  await context.clearCookies()
  await page.goto("/login")
  await page.getByLabel("邮箱").fill(electricianEmail)
  await page.getByLabel("密码").fill(electricianPassword)
  await page.getByRole("button", { name: "登录" }).click()

  await page.waitForURL("**/electrician", { timeout: 15_000 })
  await expect(
    page.getByRole("heading", { name: "电工工作台" })
  ).toBeVisible()
  await expect(page.getByText(`欢迎,${electricianName}`)).toBeVisible()
})
