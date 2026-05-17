import { z } from "zod"

import { apiError, apiOk } from "@/lib/api"
import { logAdminAction } from "@/lib/audit-log"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  ban: z.boolean(),
  reason: z.string().max(500).optional(),
})

/** 封禁 / 解封用户 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session?.user) return apiError("UNAUTHORIZED", "请先登录", 401)
  if (session.user.role !== "ADMIN") {
    return apiError("FORBIDDEN", "需要管理员权限", 403)
  }
  if (id === session.user.id) {
    return apiError("CONFLICT", "不能封禁自己", 409)
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return apiError("INVALID_INPUT", parsed.error.issues[0].message, 400)
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, isBanned: true },
  })
  if (!target) return apiError("NOT_FOUND", "用户不存在", 404)
  if (target.role === "ADMIN") {
    return apiError("FORBIDDEN", "不能封禁管理员", 403)
  }

  await prisma.user.update({
    where: { id },
    data: { isBanned: parsed.data.ban },
  })

  await logAdminAction({
    adminId: session.user.id,
    action: parsed.data.ban ? "BAN_USER" : "UNBAN_USER",
    targetType: "USER",
    targetId: id,
    detail: { reason: parsed.data.reason ?? null },
  })

  return apiOk({ ok: true, isBanned: parsed.data.ban })
}
