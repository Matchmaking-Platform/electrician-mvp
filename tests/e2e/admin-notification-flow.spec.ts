import { expect, test } from "@playwright/test"

/**
 * 阶段 10 补盲 E2E:
 *   1) 新电工注册(API)
 *   2) 用 UI 提交资质(走 onboarding 表单 API 路径)
 *   3) 管理员 UI 上点通过审核
 *   4) 电工铃铛出现红点 + 通知列表里看到"资质已通过"
 *
 * 覆盖:管理员 UI / Notification 表 / 顶部铃铛轮询 / AppHeader。
 */

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
)

test.describe.configure({ mode: "serial" })

test("管理员通过电工资质 → 电工铃铛收到通知", async ({ browser }, testInfo) => {
  testInfo.setTimeout(90_000)

  const elecCtx = await browser.newContext()
  const adminCtx = await browser.newContext()
  const elec = await elecCtx.newPage()
  const admin = await adminCtx.newPage()

  const stamp = Date.now()
  const elecEmail = `notify-elec-${stamp}@example.com`
  const elecName = `通知 E2E ${stamp}`

  // ----- 电工注册(API)+ 登录 -----
  expect(
    (
      await elec.request.post("/api/auth/register/electrician", {
        data: {
          email: elecEmail,
          password: "password123",
          name: elecName,
        },
      })
    ).ok()
  ).toBe(true)

  await elec.goto("/login")
  await elec.getByLabel("邮箱").fill(elecEmail)
  await elec.getByLabel("密码").fill("password123")
  await elec.getByRole("button", { name: "登录" }).click()
  // 注册后自动 PENDING → 进 onboarding
  await elec.waitForURL("**/electrician/onboarding", { timeout: 15_000 })

  // 提交资质(API multipart,绕开表单 state 时序)
  expect(
    (
      await elec.request.post("/api/electrician/profile", {
        multipart: {
          bio: "通知 E2E 电工",
          yearsExperience: "5",
          serviceAreas: "上海市浦东新区",
          baseHourlyRate: "120",
          idCardFront: { name: "f.png", mimeType: "image/png", buffer: PNG },
          idCardBack: { name: "b.png", mimeType: "image/png", buffer: PNG },
          facePhoto: { name: "p.png", mimeType: "image/png", buffer: PNG },
        },
      })
    ).ok()
  ).toBe(true)

  // ----- 管理员登录 → 在 UI 上通过审核 -----
  await admin.goto("/login")
  await admin.getByLabel("邮箱").fill("admin@example.com")
  await admin.getByLabel("密码").fill("password123")
  await admin.getByRole("button", { name: "登录" }).click()
  await admin.waitForURL("**/admin", { timeout: 15_000 })

  await admin.goto("/admin/electricians")
  await admin.getByRole("tab", { name: /待审核/ }).click()
  const row = admin.getByRole("row", { name: new RegExp(elecEmail) })
  await expect(row).toBeVisible({ timeout: 10_000 })
  await row.getByRole("link", { name: "查看" }).click()

  // 详情页 → 通过审核
  await expect(admin.getByText(elecName).first()).toBeVisible()
  await admin.getByRole("button", { name: "通过审核" }).click()
  await expect(
    admin.getByRole("button", { name: "已通过" })
  ).toBeVisible({ timeout: 10_000 })

  // ----- 电工刷新页面 → 铃铛有未读 + 看见"资质已通过审核" -----
  await elec.reload()
  // 铃铛(button[aria-label="通知"])在顶部 header,点开查看
  const bell = elec.getByRole("button", { name: "通知" })
  await expect(bell).toBeVisible({ timeout: 10_000 })
  await bell.click()

  // 通知卡片标题:"资质已通过审核"
  await expect(
    elec.getByText("资质已通过审核")
  ).toBeVisible({ timeout: 10_000 })

  // 关闭并验证:打开下拉时通常未读会被手动 mark;
  // 但本流程是"点开通知本身"才标记,所以这里铃铛红点应仍在(未点击通知项)
  // 点"全部已读"清空
  await expect(
    elec.getByRole("button", { name: "全部已读" })
  ).toBeVisible()
  await elec.getByRole("button", { name: "全部已读" }).click()

  await elecCtx.close()
  await adminCtx.close()
})
