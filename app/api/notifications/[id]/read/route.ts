import { apiError, apiOk } from "@/lib/api"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session?.user) return apiError("UNAUTHORIZED", "请先登录", 401)

  const r = await prisma.notification.updateMany({
    where: { id, userId: session.user.id },
    data: { isRead: true },
  })
  if (r.count === 0) return apiError("NOT_FOUND", "通知不存在", 404)
  return apiOk({ ok: true })
}
