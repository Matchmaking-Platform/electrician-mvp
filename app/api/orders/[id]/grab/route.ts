import { OrderStatus, VerificationStatus } from "@prisma/client"

import { apiError, apiOk } from "@/lib/api"
import { getSession } from "@/lib/auth"
import { notifyOrderAccepted } from "@/lib/notifications"
import { prisma } from "@/lib/prisma"

/**
 * 电工抢单 —— 原子操作:`updateMany` 带状态条件,后到的拿到 count=0 → 409。
 * 前置:必须 ELECTRICIAN + APPROVED + 该订单尚为 PENDING + 未指派。
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session?.user) return apiError("UNAUTHORIZED", "请先登录", 401)
  if (session.user.role !== "ELECTRICIAN") {
    return apiError("FORBIDDEN", "仅电工可抢单", 403)
  }

  const profile = await prisma.electricianProfile.findUnique({
    where: { userId: session.user.id },
    select: { verificationStatus: true },
  })
  if (!profile || profile.verificationStatus !== VerificationStatus.APPROVED) {
    return apiError("FORBIDDEN", "需先通过资质审核", 403)
  }

  const result = await prisma.order.updateMany({
    where: {
      id,
      status: OrderStatus.PENDING,
      electricianId: null,
    },
    data: {
      status: OrderStatus.ACCEPTED,
      electricianId: session.user.id,
      acceptedAt: new Date(),
    },
  })

  if (result.count === 0) {
    // 可能:不存在 / 已被抢 / 已取消
    const exists = await prisma.order.findUnique({
      where: { id },
      select: { status: true, electricianId: true },
    })
    if (!exists) return apiError("NOT_FOUND", "订单不存在", 404)
    return apiError("CONFLICT", "订单已被其他师傅抢走或已取消", 409)
  }

  // 通知顾客
  const taken = await prisma.order.findUnique({
    where: { id },
    select: { customerId: true, title: true },
  })
  if (taken) {
    await notifyOrderAccepted({
      customerId: taken.customerId,
      orderId: id,
      orderTitle: taken.title,
      electricianName: session.user.name,
    })
  }

  return apiOk({ ok: true, orderId: id })
}
