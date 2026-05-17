import { apiError, apiOk } from "@/lib/api"
import { logAdminAction } from "@/lib/audit-log"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { recomputeElectricianRating } from "@/lib/ratings"
import { reviewHideSchema } from "@/lib/validators/review"

/** 管理员下架评价(理由必填) */
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

  const body = await req.json().catch(() => null)
  const parsed = reviewHideSchema.safeParse(body)
  if (!parsed.success) {
    return apiError("INVALID_INPUT", parsed.error.issues[0].message, 400)
  }

  const review = await prisma.review.findUnique({
    where: { id },
    select: { id: true, electricianId: true, isHidden: true },
  })
  if (!review) return apiError("NOT_FOUND", "评价不存在", 404)
  if (review.isHidden) return apiError("CONFLICT", "已下架", 409)

  await prisma.$transaction(async (tx) => {
    await tx.review.update({
      where: { id },
      data: {
        isHidden: true,
        hiddenReason: parsed.data.reason,
      },
    })
    await recomputeElectricianRating(tx, review.electricianId)
  })

  await logAdminAction({
    adminId: session.user.id,
    action: "HIDE_REVIEW",
    targetType: "REVIEW",
    targetId: id,
    detail: { reason: parsed.data.reason },
  })

  return apiOk({ ok: true })
}

/** 管理员恢复一条已下架的评价 */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session?.user) return apiError("UNAUTHORIZED", "请先登录", 401)
  if (session.user.role !== "ADMIN") {
    return apiError("FORBIDDEN", "需要管理员权限", 403)
  }

  const review = await prisma.review.findUnique({
    where: { id },
    select: { id: true, electricianId: true, isHidden: true },
  })
  if (!review) return apiError("NOT_FOUND", "评价不存在", 404)
  if (!review.isHidden) return apiError("CONFLICT", "评价未下架", 409)

  await prisma.$transaction(async (tx) => {
    await tx.review.update({
      where: { id },
      data: {
        isHidden: false,
        hiddenReason: null,
      },
    })
    await recomputeElectricianRating(tx, review.electricianId)
  })

  await logAdminAction({
    adminId: session.user.id,
    action: "UNHIDE_REVIEW",
    targetType: "REVIEW",
    targetId: id,
  })

  return apiOk({ ok: true })
}
