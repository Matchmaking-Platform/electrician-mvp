import { apiError, apiOk } from "@/lib/api"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { saveImage } from "@/lib/uploads"

/**
 * 编辑/删除单条案例。
 * 仅本人可改自己的案例(profile.userId === session.user.id)。
 */

async function loadOwnedCase(userId: string, caseId: string) {
  return prisma.portfolioCase.findFirst({
    where: {
      id: caseId,
      electrician: { userId },
    },
    select: { id: true, electricianId: true, images: true },
  })
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session?.user) return apiError("UNAUTHORIZED", "请先登录", 401)
  if (session.user.role !== "ELECTRICIAN") {
    return apiError("FORBIDDEN", "仅电工", 403)
  }

  const existing = await loadOwnedCase(session.user.id, id)
  if (!existing) return apiError("NOT_FOUND", "案例不存在或无权操作", 404)

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return apiError("INVALID_INPUT", "请求格式错误", 400)
  }

  const title = String(form.get("title") ?? "").trim()
  const description = String(form.get("description") ?? "").trim()
  if (!title) return apiError("INVALID_INPUT", "标题必填", 400)
  if (title.length > 100) return apiError("INVALID_INPUT", "标题最多 100 字", 400)
  if (description.length > 1000) {
    return apiError("INVALID_INPUT", "描述最多 1000 字", 400)
  }

  // 解析要保留的旧图片 URL
  const keepRaw = form.get("keepImages")
  let kept: string[] = []
  if (typeof keepRaw === "string" && keepRaw.trim()) {
    try {
      const parsed = JSON.parse(keepRaw)
      if (Array.isArray(parsed)) {
        kept = parsed.map(String).filter((s) => s.startsWith("/uploads/"))
      }
    } catch {
      return apiError("INVALID_INPUT", "keepImages 不是合法 JSON", 400)
    }
  }

  // 上传新图
  const newFiles = form
    .getAll("images")
    .filter((v): v is File => v instanceof File && v.size > 0)
  const newUrls: string[] = []
  for (const f of newFiles) {
    const res = await saveImage({
      file: f,
      subdir: `electrician/${session.user.id}/cases`,
    })
    if (!res.ok) return apiError("INVALID_INPUT", res.error, 400)
    newUrls.push(res.url)
  }
  const images = [...kept, ...newUrls].slice(0, 8)

  const updated = await prisma.portfolioCase.update({
    where: { id },
    data: { title, description, images },
    select: { id: true, title: true, description: true, images: true },
  })

  return apiOk({ case: updated })
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session?.user) return apiError("UNAUTHORIZED", "请先登录", 401)
  if (session.user.role !== "ELECTRICIAN") {
    return apiError("FORBIDDEN", "仅电工", 403)
  }

  const existing = await loadOwnedCase(session.user.id, id)
  if (!existing) return apiError("NOT_FOUND", "案例不存在或无权操作", 404)

  await prisma.portfolioCase.delete({ where: { id } })
  return apiOk({ deleted: true })
}
